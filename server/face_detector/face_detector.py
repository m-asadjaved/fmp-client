import os
import time
import cv2
import numpy as np
import ffmpeg
import tempfile
import urllib.request

# ─── CONFIG ────────────────────────────────────────────────────────────────
BOX_COLOR = (0, 255, 0)
BOX_THICKNESS = 3

YUNET_SCORE_THRESHOLD = 0.7
YUNET_NMS_THRESHOLD = 0.3
YUNET_INPUT_SIZE = (320, 320)          # internal detector resize; detection is scale-corrected

IOU_MATCH_THRESHOLD = 0.3
MAX_CENTROID_DIST_FRAC = 0.15
MAX_HOLD_FRAMES = 8
MAX_SIZE_RATIO = 2.5                    # reject a match if box area jumps more than this between frames

USE_LANDMARK_VALIDATION = True
USE_LIGHTING_NORMALIZATION = True
USE_BLUR_REJECTION = True
BLUR_VARIANCE_THRESHOLD = 40.0          # below this, treat detection as unreliable (tune per footage)

YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"


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
    lab = cv2.cvtColor(small_frame, cv2.COLOR_BGR2LAB)  # now operating on 320x320, not 1920x1080
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def blur_score(gray_crop):
    if gray_crop.size == 0:
        return 0.0
    return cv2.Laplacian(gray_crop, cv2.CV_64F).var()


def landmarks_plausible(landmarks, box):
    """Rejects 'face-shaped' false positives via eye/nose/mouth geometry sanity checks."""
    if landmarks is None or len(landmarks) < 5:
        return False

    x, y, w, h = box
    if w <= 0 or h <= 0:
        return False

    re, le, nose, rm, lm = landmarks[:5]

    eye_dy = abs(re[1] - le[1])
    if eye_dy > h * 0.25:
        return False

    eye_y_avg = (re[1] + le[1]) / 2.0
    mouth_y_avg = (rm[1] + lm[1]) / 2.0
    if not (eye_y_avg < nose[1] < mouth_y_avg):
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
    def __init__(self, model_path, input_size=(320, 320), score_threshold=0.6, nms_threshold=0.3):
        self.input_w, self.input_h = input_size
        self.detector = cv2.FaceDetectorYN.create(
            model_path, "", input_size,
            score_threshold=score_threshold, nms_threshold=nms_threshold
        )

    def detect(self, frame):
        h, w = frame.shape[:2]

        # Resize to the detector's actual working resolution — this is the fix.
        # Previously setInputSize((w, h)) forced YuNet to run at full 1920x1080
        # every frame, which is the main source of the 6x slowdown.
        scale_x = w / self.input_w
        scale_y = h / self.input_h
        small = cv2.resize(frame, (self.input_w, self.input_h))

        self.detector.setInputSize((self.input_w, self.input_h))
        _, faces = self.detector.detect(small)

        detections = []
        if faces is not None:
            for f in faces:
                x, y, fw, fh = f[:4]
                # Scale box back up to original frame coordinates
                x = int(x * scale_x)
                y = int(y * scale_y)
                fw = int(fw * scale_x)
                fh = int(fh * scale_y)
                x, y = max(0, x), max(0, y)

                # Landmarks are f[4:14] as 5 (x,y) pairs — scale these too
                landmarks = f[4:14].reshape(5, 2)
                landmarks[:, 0] *= scale_x
                landmarks[:, 1] *= scale_y

                confidence = float(f[-1])
                detections.append({
                    "box": (x, y, fw, fh),
                    "landmarks": landmarks,
                    "confidence": confidence
                })
        return detections

# ─── KALMAN SMOOTHING ─────────────────────────────────────────────────────────
class SmoothedBox:
    """Smooths a box's position/size across frames to remove jitter from raw detections."""
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


# ─── TRACKING (stabilizes boxes across frames, no identity) ─────────────────
class FaceTrack:
    def __init__(self, track_id, box, confidence):
        self.id = track_id
        self.box = box
        self.confidence = confidence
        self.frames_since_seen = 0
        self.smoother = SmoothedBox(box)
        self.smoothed_box = box


class FaceTracker:
    def __init__(self, frame_width):
        self.tracks = {}
        self.next_id = 0
        self.max_centroid_dist = frame_width * MAX_CENTROID_DIST_FRAC

    def update(self, detections):
        unmatched_tracks = set(self.tracks.keys())
        pairs = []
        for tid in unmatched_tracks:
            for di, det in enumerate(detections):
                score = iou(self.tracks[tid].box, det["box"])
                if score >= IOU_MATCH_THRESHOLD:
                    ratio = area(det["box"]) / area(self.tracks[tid].box)
                    if ratio < (1 / MAX_SIZE_RATIO) or ratio > MAX_SIZE_RATIO:
                        continue
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

        for di in range(len(detections)):
            if di not in used_dets:
                det = detections[di]
                self.tracks[self.next_id] = FaceTrack(self.next_id, det["box"], det["confidence"])
                self.next_id += 1

        dead_ids = []
        for tid in self.tracks:
            if tid not in used_tracks:
                track = self.tracks[tid]
                track.frames_since_seen += 1
                track.smoothed_box = track.smoother.predict_only()
                if track.frames_since_seen > MAX_HOLD_FRAMES:
                    dead_ids.append(tid)
        for tid in dead_ids:
            del self.tracks[tid]

        return list(self.tracks.values())


# ─── MAIN ENGINE ─────────────────────────────────────────────────────────────
def detect_faces(input_path, output_path="output_with_faces.mp4"):
    print(f"🚀 Starting face detection on {input_path} ...")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"❌ Input video not found: {input_path}")

    yunet_path = ensure_yunet_model()
    yunet = YuNetDetector(yunet_path)

    tmp_dir = tempfile.gettempdir()
    tmp_video_only = os.path.join(tmp_dir, f"_faces_video_only_{int(time.time())}.mp4")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise IOError(f"❌ Cannot open video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = frame_count / fps if fps > 0 else 0

    print(f"🎥 Source video: {width}x{height} @ {fps:.2f}fps | frames={frame_count} | duration≈{duration_sec:.1f}s")

    writer = cv2.VideoWriter(tmp_video_only, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    tracker = FaceTracker(frame_width=width)

    frame_idx = 0
    frames_with_faces = 0
    max_concurrent_faces = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detect_input = normalize_lighting(frame) if USE_LIGHTING_NORMALIZATION else frame
        raw_detections = yunet.detect(detect_input)

        if USE_LANDMARK_VALIDATION:
            raw_detections = [d for d in raw_detections if landmarks_plausible(d.get("landmarks"), d["box"])]

        if USE_BLUR_REJECTION:
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            filtered = []
            for d in raw_detections:
                x, y, w, h = d["box"]
                crop = gray_frame[y:y + h, x:x + w]
                if blur_score(crop) >= BLUR_VARIANCE_THRESHOLD:
                    filtered.append(d)
            raw_detections = filtered

        active_tracks = tracker.update(raw_detections)

        if active_tracks:
            frames_with_faces += 1
            max_concurrent_faces = max(max_concurrent_faces, len(active_tracks))

        if frame_idx % 30 == 0:
            print(f"⏱️  ~{frame_idx / fps:.1f}s: {len(active_tracks)} face(s) detected")

        for track in active_tracks:
            x, y, w, h = track.smoothed_box
            cv2.rectangle(frame, (x, y), (x + w, y + h), BOX_COLOR, BOX_THICKNESS)
            label = f"{track.confidence:.2f}"
            cv2.putText(frame, label, (x, max(0, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, BOX_COLOR, 2)

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    print(f"📊 Faces detected in {frames_with_faces}/{frame_idx} frames | max concurrent faces: {max_concurrent_faces}")

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
    detect_faces("./input2.mp4", "output_with_faces.mp4")