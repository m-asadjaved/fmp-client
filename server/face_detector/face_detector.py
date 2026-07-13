import os
import time
import json
import base64
import cv2
import numpy as np
import ffmpeg
import tempfile
import urllib.request
from collections import deque
from google import genai
from google.genai import types

# ─── CONFIG ────────────────────────────────────────────────────────────────
BOX_COLOR = (0, 255, 0)
BOX_THICKNESS = 3

YUNET_SCORE_THRESHOLD = 0.7
YUNET_NMS_THRESHOLD = 0.3
YUNET_INPUT_SIZE = (640, 640)

IOU_MATCH_THRESHOLD = 0.3
MAX_CENTROID_DIST_FRAC = 0.15
MAX_HOLD_FRAMES = 8
MAX_SIZE_RATIO = 2.5
MIN_CONFIRM_FRAMES = 3

USE_LANDMARK_VALIDATION = True
USE_LIGHTING_NORMALIZATION = True
USE_BLUR_REJECTION = True

BLUR_CALIBRATION_SECONDS = 3.0
BLUR_PERCENTILE = 15
BLUR_FALLBACK_THRESHOLD = 40.0

YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

# --- Gemini / zoom decision config ---
GEMINI_MODEL = "gemini-2.5-flash"
ZOOM_DECISION_EVERY_SECONDS = 3.0   # ask Gemini for a new zoom decision this often
OUTPUT_ASPECT = 9.0 / 16.0          # vertical shorts/reels aspect (w/h)
ZOOM_PADDING_FRAC = 0.9             # how tightly to frame the chosen face (higher = looser crop)
CROP_SMOOTHING_ALPHA = 0.08         # 0-1, lower = smoother/slower camera movement between decisions
LABEL_COLORS = [
    (66, 133, 244), (219, 68, 55), (244, 180, 0), (15, 157, 88),
    (171, 71, 188), (255, 112, 67),
]

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("⚠️ GEMINI_API_KEY environment variable not set!")
client = genai.Client(api_key=api_key)


# ─── MODEL DOWNLOAD ──────────────────────────────────────────────────────────
def ensure_yunet_model(model_path="face_detection_yunet.onnx"):
    if not os.path.exists(model_path):
        print("⬇️  Downloading YuNet face detection model ...")
        urllib.request.urlretrieve(YUNET_MODEL_URL, model_path)
    return model_path


# ─── GEOMETRY HELPERS ────────────────────────────────────────────────────────
def iou(box_a, box_b):
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def centroid(box):
    x, y, w, h = box
    return (x + w / 2.0, y + h / 2.0)


def area(box):
    return max(1, box[2] * box[3])


# ─── PREPROCESSING ───────────────────────────────────────────────────────────
def normalize_lighting(small_frame):
    lab = cv2.cvtColor(small_frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def blur_score(gray_crop):
    if gray_crop.size == 0:
        return 0.0
    return cv2.Laplacian(gray_crop, cv2.CV_64F).var()


class BlurBaseline:
    def __init__(self, fps, calibration_seconds=BLUR_CALIBRATION_SECONDS):
        self.samples = []
        self.calibration_frames = int(fps * calibration_seconds) if fps > 0 else 75
        self.threshold = None

    def observe(self, score):
        if self.threshold is not None:
            return
        self.samples.append(score)

    def maybe_finalize(self, frame_idx):
        if self.threshold is not None:
            return
        if frame_idx >= self.calibration_frames:
            if len(self.samples) >= 5:
                self.threshold = float(np.percentile(self.samples, BLUR_PERCENTILE))
                print(f"📐 Blur threshold calibrated: {self.threshold:.2f} (from {len(self.samples)} samples)")
            else:
                self.threshold = BLUR_FALLBACK_THRESHOLD
                print(f"📐 Blur threshold: fallback {self.threshold:.2f}")

    def is_sharp_enough(self, score):
        if self.threshold is None:
            return True
        return score >= self.threshold


def _rotate_point(px, py, cx, cy, angle_rad):
    s, c = np.sin(angle_rad), np.cos(angle_rad)
    dx, dy = px - cx, py - cy
    rx = dx * c - dy * s
    ry = dx * s + dy * c
    return rx + cx, ry + cy


def landmarks_plausible(landmarks, box):
    if landmarks is None or len(landmarks) < 5:
        return False
    x, y, w, h = box
    if w <= 0 or h <= 0:
        return False

    aspect = w / float(h)
    if aspect < 0.6 or aspect > 1.5:
        return False

    re, le, nose, rm, lm = landmarks[:5]
    eye_dx = le[0] - re[0]
    eye_dy = le[1] - re[1]
    angle = np.arctan2(eye_dy, eye_dx)

    cx, cy = x + w / 2.0, y + h / 2.0
    pts = [re, le, nose, rm, lm]
    rotated = [_rotate_point(px, py, cx, cy, -angle) for (px, py) in pts]
    re_r, le_r, nose_r, rm_r, lm_r = rotated

    eye_dy_r = abs(re_r[1] - le_r[1])
    if eye_dy_r > h * 0.25:
        return False

    eye_y_avg = (re_r[1] + le_r[1]) / 2.0
    mouth_y_avg = (rm_r[1] + lm_r[1]) / 2.0
    if not (eye_y_avg < nose_r[1] < mouth_y_avg):
        return False

    eye_dist = abs(le_r[0] - re_r[0])
    eye_ratio = eye_dist / float(w)
    if eye_ratio < 0.30 or eye_ratio > 0.65:
        return False

    eye_mid_x = (re_r[0] + le_r[0]) / 2.0
    nose_offset = abs(nose_r[0] - eye_mid_x) / float(eye_dist) if eye_dist > 0 else 1.0
    if nose_offset > 0.35:
        return False

    mouth_mid_x = (rm_r[0] + lm_r[0]) / 2.0
    mouth_offset = abs(mouth_mid_x - eye_mid_x) / float(eye_dist) if eye_dist > 0 else 1.0
    if mouth_offset > 0.35:
        return False

    mouth_width = abs(rm_r[0] - lm_r[0])
    if mouth_width > eye_dist * 1.6:
        return False

    pad = 0.15
    x0, y0 = x - w * pad, y - h * pad
    x1, y1 = x + w * (1 + pad), y + h * (1 + pad)
    for (px, py) in landmarks[:5]:
        if not (x0 <= px <= x1 and y0 <= py <= y1):
            return False

    return True


# ─── YUNET DETECTOR ──────────────────────────────────────────────────────────
class YuNetDetector:
    def __init__(self, model_path, input_size=(640, 640), score_threshold=0.7, nms_threshold=0.3):
        self.input_w, self.input_h = input_size
        self.detector = cv2.FaceDetectorYN.create(
            model_path, "", input_size,
            score_threshold=score_threshold, nms_threshold=nms_threshold
        )

    def detect(self, frame):
        h, w = frame.shape[:2]
        scale_x = w / self.input_w
        scale_y = h / self.input_h
        small = cv2.resize(frame, (self.input_w, self.input_h))
        self.detector.setInputSize((self.input_w, self.input_h))
        _, faces = self.detector.detect(small)

        detections = []
        if faces is not None:
            for f in faces:
                x, y, fw, fh = f[:4]
                x = int(x * scale_x)
                y = int(y * scale_y)
                fw = int(fw * scale_x)
                fh = int(fh * scale_y)
                x, y = max(0, x), max(0, y)
                landmarks = f[4:14].reshape(5, 2).copy()
                landmarks[:, 0] *= scale_x
                landmarks[:, 1] *= scale_y
                confidence = float(f[-1])
                detections.append({"box": (x, y, fw, fh), "landmarks": landmarks, "confidence": confidence})
        return detections


# ─── KALMAN SMOOTHING ─────────────────────────────────────────────────────────
class SmoothedBox:
    def __init__(self, box):
        self.kalman = cv2.KalmanFilter(8, 4)
        self.kalman.transitionMatrix = np.eye(8, dtype=np.float32)
        for i in range(4):
            self.kalman.transitionMatrix[i, i + 4] = 1
        self.kalman.measurementMatrix = np.eye(4, 8, dtype=np.float32)
        self.kalman.processNoiseCov = np.eye(8, dtype=np.float32) * 0.03
        self.kalman.measurementNoiseCov = np.eye(4, dtype=np.float32) * 1.0
        x, y, w, h = box
        self.kalman.statePre = np.array([x, y, w, h, 0, 0, 0, 0], dtype=np.float32)
        self.kalman.statePost = self.kalman.statePre.copy()

    def update(self, box):
        x, y, w, h = box
        measurement = np.array([x, y, w, h], dtype=np.float32)
        self.kalman.correct(measurement)
        pred = self.kalman.predict()
        return tuple(max(0, int(round(v))) for v in pred[:4])

    def predict_only(self):
        pred = self.kalman.predict()
        return tuple(max(0, int(round(v))) for v in pred[:4])


# ─── APPEARANCE MODEL ─────────────────────────────────────────────────────────
def color_histogram(frame, box):
    x, y, w, h = box
    if w <= 0 or h <= 0:
        return None
    crop = frame[max(0, y):y + h, max(0, x):x + w]
    if crop.size == 0:
        return None
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist.flatten()


def histogram_similarity(h1, h2):
    if h1 is None or h2 is None:
        return 0.0
    return cv2.compareHist(h1.astype(np.float32), h2.astype(np.float32), cv2.HISTCMP_CORREL)


# ─── TRACKING ─────────────────────────────────────────────────────────────────
class FaceTrack:
    def __init__(self, track_id, box, confidence, appearance=None):
        self.id = track_id
        self.box = box
        self.confidence = confidence
        self.frames_since_seen = 0
        self.smoother = SmoothedBox(box)
        self.smoothed_box = box
        self.appearance = appearance
        self.hit_streak = 1
        self._ever_confirmed = False
        # Slow-moving average of face size, decoupled from position — this
        # is what the crop ZOOM AMOUNT is based on, so single-frame detector
        # noise in box width/height can't make the crop breathe in and out.
        self.size_avg_w = float(box[2])
        self.size_avg_h = float(box[3])

    @property
    def is_confirmed(self):
        # FIX: confirmation is STICKY. Once a track has proven itself with
        # MIN_CONFIRM_FRAMES consecutive hits, it stays "confirmed" for the
        # rest of its life (until it actually dies from MAX_HOLD_FRAMES of
        # being unseen), even if it has an occasional single-frame miss.
        # Previously, a single missed frame reset hit_streak to 0, which
        # immediately un-confirmed the track and required 3 fresh hits to
        # come back — causing the face count (and therefore the zoom/wide
        # mode) to flicker on totally ordinary single-frame detection noise.
        if self.hit_streak >= MIN_CONFIRM_FRAMES:
            self._ever_confirmed = True
        return self._ever_confirmed

    def update_size_avg(self, box, alpha=0.05):
        # Very slow low-pass filter on size only — position can move
        # naturally frame to frame, but the crop's ZOOM LEVEL should only
        # drift slowly, or it reads as the camera breathing in and out.
        self.size_avg_w += alpha * (box[2] - self.size_avg_w)
        self.size_avg_h += alpha * (box[3] - self.size_avg_h)


class FaceTracker:
    def __init__(self, frame_width):
        self.tracks = {}
        self.next_id = 0
        self.max_centroid_dist = frame_width * MAX_CENTROID_DIST_FRAC

    def update(self, detections, frame=None):
        unmatched_tracks = set(self.tracks.keys())
        det_appearance = [None] * len(detections)
        if frame is not None:
            for di, det in enumerate(detections):
                det_appearance[di] = color_histogram(frame, det["box"])

        pairs = []
        for tid in unmatched_tracks:
            track_candidates = []
            for di, det in enumerate(detections):
                score = iou(self.tracks[tid].box, det["box"])
                if score >= IOU_MATCH_THRESHOLD:
                    ratio = area(det["box"]) / area(self.tracks[tid].box)
                    if ratio < (1 / MAX_SIZE_RATIO) or ratio > MAX_SIZE_RATIO:
                        continue
                    track_candidates.append((score, di))

            if len(track_candidates) > 1 and frame is not None:
                track_hist = self.tracks[tid].appearance
                best = max(
                    track_candidates,
                    key=lambda sd: (histogram_similarity(track_hist, det_appearance[sd[1]]), sd[0]),
                )
                pairs.append((best[0], tid, best[1]))
            else:
                for score, di in track_candidates:
                    pairs.append((score, tid, di))

        pairs.sort(reverse=True, key=lambda p: p[0])

        used_tracks, used_dets = set(), set()
        matches = []
        for score, tid, di in pairs:
            if tid in used_tracks or di in used_dets:
                continue
            matches.append((tid, di))
            used_tracks.add(tid)
            used_dets.add(di)

        remaining_tracks = unmatched_tracks - used_tracks
        remaining_dets = set(range(len(detections))) - used_dets
        for tid in list(remaining_tracks):
            best_di, best_dist = None, self.max_centroid_dist
            tc = centroid(self.tracks[tid].box)
            for di in remaining_dets:
                dc = centroid(detections[di]["box"])
                dist = ((tc[0] - dc[0]) ** 2 + (tc[1] - dc[1]) ** 2) ** 0.5
                if dist < best_dist:
                    best_dist, best_di = dist, di
            if best_di is not None:
                matches.append((tid, best_di))
                used_tracks.add(tid)
                used_dets.add(best_di)
                remaining_dets.discard(best_di)

        for tid, di in matches:
            det = detections[di]
            track = self.tracks[tid]
            track.box = det["box"]
            track.confidence = det["confidence"]
            track.smoothed_box = track.smoother.update(det["box"])
            track.frames_since_seen = 0
            track.hit_streak += 1
            track.update_size_avg(det["box"])
            if det_appearance[di] is not None:
                track.appearance = det_appearance[di]

        for di in range(len(detections)):
            if di not in used_dets:
                det = detections[di]
                new_track = FaceTrack(self.next_id, det["box"], det["confidence"], appearance=det_appearance[di])
                self.tracks[self.next_id] = new_track
                self.next_id += 1

        dead_ids = []
        for tid in self.tracks:
            if tid not in used_tracks:
                track = self.tracks[tid]
                track.frames_since_seen += 1
                track.hit_streak = max(0, track.hit_streak - 2)  # decay, don't zero — one blip shouldn't undo 3 good hits
                track.smoothed_box = track.smoother.predict_only()
                if track.frames_since_seen > MAX_HOLD_FRAMES:
                    dead_ids.append(tid)
        for tid in dead_ids:
            del self.tracks[tid]

        return list(self.tracks.values())


# ─── GEMINI ZOOM DECISION ─────────────────────────────────────────────────────
ZOOM_DECISION_SCHEMA = {
    "type": "object",
    "properties": {
        "has_single_main_person": {
            "type": "boolean",
            "description": (
                "true if ONE of the visible faces is clearly the main person to "
                "focus on right now (e.g. the one speaking, or the one the moment "
                "is about) and the others are incidental/background. false if two "
                "or more faces matter at the same time (e.g. a conversation, a "
                "group reacting together) and the full frame should be shown "
                "instead of cropping to one person."
            ),
        },
        "main_person_label": {
            "type": "string",
            "description": "If has_single_main_person is true, the letter label (e.g. 'A') of that person. Omit or leave empty otherwise."
        },
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
    "required": ["has_single_main_person", "main_person_label", "confidence", "reason"],
}

SYSTEM_PROMPT = """You are deciding how to reframe a 16:9 video into a 9:16 vertical \
short-form crop (like Instagram Reels/TikTok).

Each visible face is outlined with a colored box and labeled "Face A", "Face B", etc.

Simple question: is there ONE person in this frame who is clearly the main person to \
focus on right now (e.g. the one speaking, or who the moment is about), with any other \
visible faces being incidental background people? 

- If YES: set has_single_main_person=true and main_person_label to that person's letter. \
The video will crop/zoom to that person's face.
- If NO — meaning two or more people matter at the same time (a conversation, a group \
reacting together, etc.) — set has_single_main_person=false. The full original frame \
will be shown instead so nobody important is cropped out.

If in doubt whether a background face matters, prefer false (show everyone) so nobody \
important gets cropped out.

Respond ONLY with the JSON described by the schema."""


def draw_labeled_faces(frame, tracks, track_id_to_label):
    out = frame.copy()
    for track in tracks:
        label = track_id_to_label.get(track.id)
        if label is None:
            continue
        x, y, w, h = track.smoothed_box
        color = LABEL_COLORS[ord(label) % len(LABEL_COLORS)]
        cv2.rectangle(out, (x, y), (x + w, y + h), color, 3)
        cv2.putText(out, f"Face {label}", (x, max(0, y - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)
    return out


def build_track_labels(tracks):
    sorted_tracks = sorted(tracks, key=lambda t: -(t.smoothed_box[2] * t.smoothed_box[3]))
    labels = {}
    for i, t in enumerate(sorted_tracks):
        if i >= len(LABEL_COLORS):
            break
        labels[t.id] = chr(ord("A") + i)
    return labels


def frame_to_gemini_part(frame_bgr, jpeg_quality=85):
    ok, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
    if not ok:
        raise ValueError("Failed to encode frame as JPEG")
    return types.Part.from_bytes(data=buf.tobytes(), mime_type="image/jpeg")


def ask_gemini_zoom_target(frame_bgr, tracks):
    """
    Sends ONE annotated frame to Gemini and asks the direct question: is
    there one main person here? Returns (mode, track_id_or_None, raw_result_dict).
      mode: "single_character" or "wide" (defaults to "wide" on failure/no faces)
      track_id_or_None: only set when mode == "single_character"
    """
    if not tracks:
        return "wide", None, None

    labels = build_track_labels(tracks)
    if not labels:
        return "wide", None, None
    label_to_track_id = {v: k for k, v in labels.items()}

    annotated = draw_labeled_faces(frame_bgr, tracks, labels)
    part = frame_to_gemini_part(annotated)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[types.Content(role="user", parts=[part])],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ZOOM_DECISION_SCHEMA,
                temperature=0.1,
            ),
        )
        result = json.loads(response.text)
        has_main = bool(result.get("has_single_main_person"))
        if has_main:
            label = result.get("main_person_label")
            track_id = label_to_track_id.get(label)
            if track_id is None:
                # Gemini said yes but named a label that doesn't exist — fail safe to wide
                return "wide", None, result
            return "single_character", track_id, result
        return "wide", None, result
    except Exception as e:
        print(f"⚠️ Gemini zoom decision failed: {e}")
        return "wide", None, None


def ask_gemini_multiple_people(frame_bgr):
    """
    Fast check: ask Gemini if there are 2 or more people in the frame.
    Used when the local detector finds 1 strong face and 1 weak face to be absolutely sure.
    """
    part = frame_to_gemini_part(frame_bgr)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[types.Content(role="user", parts=[part])],
            config=types.GenerateContentConfig(
                system_instruction="Look at this image. Are there TWO OR MORE people clearly visible in the frame? Answer ONLY 'YES' or 'NO'.",
                temperature=0.0,
            ),
        )
        ans = response.text.strip().upper()
        return "YES" in ans
    except Exception as e:
        print(f"⚠️ Gemini multiple people check failed: {e}")
        return False



# ─── CROP / FRAME COMPOSITING ──────────────────────────────────────────────────
def compute_person_crop_box_from_data(box, frame_w, frame_h, out_aspect=OUTPUT_ASPECT):
    """Same as compute_person_crop_box but takes a raw (x,y,w,h) box directly
    — used in pass 2, which works from recorded per-frame data rather than
    live FaceTrack objects."""
    fx, fy, fw, fh = box
    face_cx = fx + fw / 2.0

    crop_h = frame_h
    crop_w = crop_h * out_aspect

    if crop_w > frame_w:
        crop_w = frame_w
        crop_h = crop_w / out_aspect

    cx = face_cx - crop_w / 2.0
    cy = (frame_h - crop_h) / 2.0

    cx = max(0, min(cx, frame_w - crop_w))
    cy = max(0, min(cy, frame_h - crop_h))

    return (cx, cy, crop_w, crop_h)


def compute_person_crop_box(track, frame_w, frame_h, out_aspect=OUTPUT_ASPECT):
    """
    'single_character' mode: CROP, not zoom. Takes a full-height vertical
    slice of the ORIGINAL frame (no magnification), sized to out_aspect,
    horizontally centered on the person — like a camera operator panning
    left/right to keep someone in frame. The person appears at their
    natural on-screen size, just reframed into 9:16; their face is not
    enlarged.
    """
    fx, fy, fw, fh = track.smoothed_box
    face_cx = fx + fw / 2.0

    crop_h = frame_h  # full source height — no zoom
    crop_w = crop_h * out_aspect

    if crop_w > frame_w:
        crop_w = frame_w
        crop_h = crop_w / out_aspect

    cx = face_cx - crop_w / 2.0
    cy = (frame_h - crop_h) / 2.0

    cx = max(0, min(cx, frame_w - crop_w))
    cy = max(0, min(cy, frame_h - crop_h))

    return (cx, cy, crop_w, crop_h)


def default_center_crop_box(frame_w, frame_h, out_aspect=OUTPUT_ASPECT):
    crop_h = frame_h
    crop_w = crop_h * out_aspect
    if crop_w > frame_w:
        crop_w = frame_w
        crop_h = crop_w / out_aspect
    cx = (frame_w - crop_w) / 2.0
    cy = (frame_h - crop_h) / 2.0
    return (cx, cy, crop_w, crop_h)


class SmoothedCrop:
    """Exponentially smooths the crop window across frames for a gradual pan."""
    def __init__(self, initial_box, alpha=CROP_SMOOTHING_ALPHA):
        self.current = np.array(initial_box, dtype=np.float64)
        self.alpha = alpha

    def update(self, target_box):
        target = np.array(target_box, dtype=np.float64)
        self.current = self.current + self.alpha * (target - self.current)
        return tuple(self.current)


def apply_face_zoom_crop(frame, crop_box, output_size):
    """Renders 'single_character' mode: crop the person-following window and resize to output. Full-height slice, no magnification of the face."""
    cx, cy, cw, ch = crop_box
    x0, y0 = int(round(cx)), int(round(cy))
    x1, y1 = int(round(cx + cw)), int(round(cy + ch))
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(frame.shape[1], x1), min(frame.shape[0], y1)
    if x1 <= x0 or y1 <= y0:
        return cv2.resize(frame, output_size)
    cropped = frame[y0:y1, x0:x1]
    return cv2.resize(cropped, output_size, interpolation=cv2.INTER_LINEAR)


def apply_wide_fit_blur(frame, output_size):
    """
    Renders 'wide' mode: fit the FULL 16:9 frame into the 9:16 output
    (no cropping, nobody gets cut out), with the empty top/bottom space
    filled by a blurred, zoomed-in copy of the same frame — the standard
    Instagram Reels / TikTok "letterbox with blurred background" look.
    """
    out_w, out_h = output_size
    src_h, src_w = frame.shape[:2]

    # 1. Background layer: scale the frame up to COVER the full output
    #    canvas (may crop left/right or top/bottom slightly), then blur it.
    bg_scale = max(out_w / src_w, out_h / src_h)
    bg_w, bg_h = int(np.ceil(src_w * bg_scale)), int(np.ceil(src_h * bg_scale))
    bg = cv2.resize(frame, (bg_w, bg_h), interpolation=cv2.INTER_LINEAR)
    # center-crop to exact output size
    bx0 = (bg_w - out_w) // 2
    by0 = (bg_h - out_h) // 2
    bg = bg[by0:by0 + out_h, bx0:bx0 + out_w]
    # heavy blur + slight darken so foreground reads clearly on top
    bg = cv2.GaussianBlur(bg, (0, 0), sigmaX=25, sigmaY=25)
    bg = cv2.convertScaleAbs(bg, alpha=0.65, beta=0)

    # 2. Foreground layer: fit the full frame by WIDTH (no cropping), center
    #    it vertically on the canvas.
    fg_scale = out_w / src_w
    fg_w, fg_h = out_w, int(round(src_h * fg_scale))
    if fg_h > out_h:
        # frame is tall relative to canvas at this scale (rare for 16:9->9:16,
        # but guard anyway) — fit by height instead so nothing is cut off
        fg_scale = out_h / src_h
        fg_w, fg_h = int(round(src_w * fg_scale)), out_h
    fg = cv2.resize(frame, (fg_w, fg_h), interpolation=cv2.INTER_LINEAR)

    canvas = bg.copy()
    fx0 = (out_w - fg_w) // 2
    fy0 = (out_h - fg_h) // 2
    canvas[fy0:fy0 + fg_h, fx0:fx0 + fg_w] = fg
    return canvas


# ─── MAIN ENGINE ─────────────────────────────────────────────────────────────
def detect_and_zoom(input_path, output_path="output_zoomed.mp4",
                     output_width=1080, output_height=1920,
                     draw_debug_boxes=False):
    """
    Full pipeline: detect + track faces, periodically ask Gemini which face
    to zoom to, and render a vertical (default 1080x1920) output that smoothly
    follows the chosen face.
    """
    print(f"🚀 Starting face detection + Gemini zoom pipeline on {input_path} ...")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"❌ Input video not found: {input_path}")

    yunet_path = ensure_yunet_model()
    # Initialize with a lower threshold (0.3) so we can catch "weak" faces
    yunet = YuNetDetector(yunet_path, YUNET_INPUT_SIZE, score_threshold=0.3, nms_threshold=YUNET_NMS_THRESHOLD)

    tmp_dir = tempfile.gettempdir()
    tmp_video_only = os.path.join(tmp_dir, f"_zoom_video_only_{int(time.time())}.mp4")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise IOError(f"❌ Cannot open video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = frame_count / fps if fps > 0 else 0
    print(f"🎥 Source video: {width}x{height} @ {fps:.2f}fps | frames={frame_count} | duration≈{duration_sec:.1f}s")

    out_size = (output_width, output_height)
    writer = cv2.VideoWriter(tmp_video_only, cv2.VideoWriter_fourcc(*"mp4v"), fps, out_size)
    tracker = FaceTracker(frame_width=width)
    blur_baseline = BlurBaseline(fps)

    default_crop = default_center_crop_box(width, height)

    # ═══ PASS 1: detect + track the whole video, recording lightweight ═══
    # per-frame data only (face count + each confirmed track's box/id) —
    # NOT the frames themselves, to keep memory reasonable on long videos.
    # This is what enables lookahead: we need to know what happens in
    # FUTURE frames before we can decide how to render the CURRENT frame.
    print("🔎 Pass 1/2: detecting and tracking faces ...")
    frame_records = []  # frame_records[i] = list of {"id": track_id, "box": (x,y,w,h)}
    frame_idx = 0
    frames_with_faces = 0
    max_concurrent_faces = 0
    next_gemini_check_frame = 0
    gemini_wide_lock_until = -1

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detect_input = normalize_lighting(frame) if USE_LIGHTING_NORMALIZATION else frame
        all_raw_detections = yunet.detect(detect_input)

        # Split into strong (confident humans) and weak (unsure if human)
        raw_detections = []
        weak_detections = []
        for d in all_raw_detections:
            if d["confidence"] >= YUNET_SCORE_THRESHOLD:
                raw_detections.append(d)
            elif d["confidence"] >= 0.35:
                weak_detections.append(d)

        if USE_LANDMARK_VALIDATION:
            raw_detections = [d for d in raw_detections if landmarks_plausible(d.get("landmarks"), d["box"])]

        if USE_BLUR_REJECTION and raw_detections:
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            filtered = []
            for d in raw_detections:
                x, y, w, h = d["box"]
                crop = gray_frame[y:y + h, x:x + w]
                score = blur_score(crop)
                blur_baseline.observe(score)
                if blur_baseline.is_sharp_enough(score):
                    filtered.append(d)
            raw_detections = filtered

        blur_baseline.maybe_finalize(frame_idx)

        all_tracks = tracker.update(raw_detections, frame=frame)
        active_tracks = [t for t in all_tracks if t.is_confirmed]

        # --- Gemini Strict Wide Mode Check ---
        # If we only confirmed 1 face, but there's a weak detection that MIGHT be a face, ask Gemini to be sure.
        if len(active_tracks) == 1 and len(weak_detections) > 0:
            if frame_idx >= next_gemini_check_frame:
                print(f"🤔 Frame {frame_idx}: 1 strong face, {len(weak_detections)} weak. Asking Gemini...")
                is_multiple = ask_gemini_multiple_people(frame)
                if is_multiple:
                    print("🤖 Gemini says YES, there are multiple people. Forcing wide mode.")
                    gemini_wide_lock_until = frame_idx + int(fps * 2.0)  # Force wide for 2 seconds
                else:
                    print("🤖 Gemini says NO, only 1 person.")
                next_gemini_check_frame = frame_idx + int(fps * 2.0)  # Don't ask again for 2 seconds

        if active_tracks:
            frames_with_faces += 1
            max_concurrent_faces = max(max_concurrent_faces, len(active_tracks))

        if frame_idx < gemini_wide_lock_until:
            # Force wide mode by pretending there are 2 tracks
            frame_records.append([{"id": -1, "box": (0,0,0,0)}, {"id": -2, "box": (0,0,0,0)}])
        else:
            frame_records.append([{"id": t.id, "box": t.smoothed_box} for t in active_tracks])

        if frame_idx % 60 == 0:
            print(f"  ⏱️  ~{frame_idx / fps:.1f}s: {len(active_tracks)} face(s) tracked")
        frame_idx += 1

    total_frames = frame_idx
    print(f"📊 Faces detected in {frames_with_faces}/{total_frames} frames | max concurrent faces: {max_concurrent_faces}")

    # ═══ Compute mode decisions ═══
    # We want to instantly switch to wide mode if there are >1 faces
    # in the current or next frame, but debounce zooming IN to single_character.
    print("🧠 Computing zoom/wide decisions ...")
    counts = [len(rec) for rec in frame_records]

    MODE_DEBOUNCE_FRAMES = max(1, int(round(fps * 0.6)))
    final_mode = [None] * total_frames
    final_target = [None] * total_frames
    cur_mode, cur_target = "wide", None
    pend_mode, pend_target, pend_stable = "wide", None, 0

    for i in range(total_frames):
        c = counts[i]
        next_c = counts[i+1] if i + 1 < total_frames else c
        
        if c == 1 and next_c <= 1:
            d_mode = "single_character"
            d_target = frame_records[i][0]["id"]
        else:
            d_mode = "wide"
            d_target = None

        if d_mode == "wide":
            cur_mode, cur_target = "wide", None
            pend_mode, pend_target, pend_stable = "wide", None, 0
        else:
            if d_mode == pend_mode and d_target == pend_target:
                pend_stable += 1
            else:
                pend_mode, pend_target, pend_stable = d_mode, d_target, 1
            
            if pend_stable >= MODE_DEBOUNCE_FRAMES:
                cur_mode, cur_target = pend_mode, pend_target

        final_mode[i] = cur_mode
        final_target[i] = cur_target

    # ═══ PASS 2: re-read the video and render using the precomputed, ═══
    # lookahead-aware decisions from above.
    print("🎬 Pass 2/2: rendering output ...")
    cap.release()
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise IOError(f"❌ Cannot re-open video for rendering: {input_path}")

    smoothed_crop = SmoothedCrop(default_crop)
    render_mode = "wide"
    mode_blend = 1.0
    MODE_BLEND_STEP = 1.0 / max(1, int(round(fps * 0.5)))  # ~0.5s crossfade between modes

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        active_tracks_data = frame_records[frame_idx]
        this_mode = final_mode[frame_idx]
        this_target = final_target[frame_idx]

        if this_mode != render_mode:
            mode_blend = 0.0
            render_mode = this_mode

        target_data = next((t for t in active_tracks_data if t["id"] == this_target), None)
        if target_data is not None:
            target_crop = compute_person_crop_box_from_data(target_data["box"], width, height)
        elif active_tracks_data:
            fallback = max(active_tracks_data, key=lambda t: t["box"][2] * t["box"][3])
            target_crop = compute_person_crop_box_from_data(fallback["box"], width, height)
        else:
            target_crop = default_crop

        crop_box = smoothed_crop.update(target_crop)

        if frame_idx % 60 == 0:
            print(f"  ⏱️  ~{frame_idx / fps:.1f}s: mode={render_mode}, target_track={this_target}")

        if draw_debug_boxes:
            for t in active_tracks_data:
                color = BOX_COLOR if t["id"] == this_target else (128, 128, 128)
                x, y, w, h = t["box"]
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, BOX_THICKNESS)

        pan_frame = apply_face_zoom_crop(frame, crop_box, out_size)
        if render_mode == "wide" or mode_blend < 1.0:
            wide_frame = apply_wide_fit_blur(frame, out_size)
        else:
            wide_frame = None

        if render_mode == "single_character" and mode_blend >= 1.0:
            output_frame = pan_frame
        elif render_mode == "wide" and mode_blend >= 1.0:
            output_frame = wide_frame
        else:
            target_frame = wide_frame if render_mode == "wide" else pan_frame
            other_frame = pan_frame if render_mode == "wide" else wide_frame
            # Cut instantly to wide to ensure exact-frame switching, but fade smoothly when zooming in
            blend_step = 1.0 if render_mode == "wide" else MODE_BLEND_STEP
            output_frame = cv2.addWeighted(other_frame, 1.0 - mode_blend, target_frame, mode_blend, 0)
            mode_blend = min(1.0, mode_blend + blend_step)

        writer.write(output_frame)
        frame_idx += 1

    cap.release()
    writer.release()

    print("⚡ Compositing final render with audio ...")
    try:
        v = ffmpeg.input(tmp_video_only)
        a = ffmpeg.input(input_path)
        (ffmpeg.output(v['v'], a['a'], output_path,
                        vcodec="libx264", preset="fast", crf=20, pix_fmt="yuv420p",
                        acodec="aac", audio_bitrate="192k",
                        movflags="+faststart", shortest=None)
               .overwrite_output().run(capture_stdout=True, capture_stderr=True))
    except ffmpeg.Error as e:
        stderr = e.stderr.decode("utf-8") if e.stderr else str(e)
        print(f"⚠️ Audio mux failed (video may have no audio track): {stderr}")
        os.replace(tmp_video_only, output_path)
        return output_path

    if os.path.exists(tmp_video_only):
        os.remove(tmp_video_only)

    print(f"🎉 Done → {output_path}")
    return output_path


if __name__ == "__main__":
    detect_and_zoom("./input2.mp4", "output_zoomed.mp4")