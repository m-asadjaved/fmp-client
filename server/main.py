import os
import time
import re
import cv2
import numpy as np
import ffmpeg
import json
import requests
import boto3

# ─── MEDIAPIPE INITIALIZATION ─────────────────────────────────────────────────
import mediapipe as mp
from mediapipe.tasks.python import vision as mp_vision

BaseOptions         = mp.tasks.BaseOptions
FaceLandmarker      = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOpts  = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode   = mp.tasks.vision.RunningMode

# Swap to /var/task/face_landmarker.task in production
MODEL_PATH = os.environ.get("MODEL_PATH", "face_landmarker.task")
print(f"✅ MediaPipe {mp.__version__} ready | model: {MODEL_PATH}")

UPPER_LIP = 13
LOWER_LIP = 14

# Initialize AWS S3 Client
s3_client = boto3.client('s3')

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def time_str_to_seconds(t):
    p = list(map(int, t.split(':')))
    return p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]


def send_status_webhook(url, status, video_url=None, user_id=None,
                        req_id=None, error_msg=None):
    if not url:
        print("⚠️ No webhook_url — skipping callback.")
        return
    body = {"req_id": req_id, "status": status,
            "video_url": video_url, "user_id": user_id, "error": error_msg}
    try:
        r = requests.post(url, json=body,
                          headers={"Content-Type": "application/json"}, timeout=15)
        print(f"{'✅' if r.status_code < 300 else '⚠️'} Webhook {r.status_code}")
    except Exception as e:
        print(f"❌ Webhook failed: {e}")


# ─── FACE TRACKER ─────────────────────────────────────────────────────────────
class AutoSpeakerTracker:
    """
    Selects the dominant speaker by a composite score:
        score = (lip_gap × 3  if talking) + √face_area × 0.01
    The winning face's center X is fed through a single strong EMA so the
    tracker output is already smooth before it reaches the camera class.

    Memory: if detection misses for up to `memory_sec` seconds we hold the
    last known position instead of snapping to center.
    """

    def __init__(self, fw, fh, fps, cfg):
        self.fw, self.fh     = fw, fh
        self.threshold       = cfg["lip_threshold_px"]
        self.alpha_lip       = cfg["lip_ema_alpha"]
        self.alpha_cx        = cfg.get("cx_ema_alpha", 0.15)  # very strong smooth
        self.detect_every    = max(1, int(fps * cfg["detect_every_sec"]))
        self._lip_ema        = {}
        self._cx_ema         = float(fw / 2)

        self.face_visible    = False
        self.talking_cx      = fw // 2
        self._last_cx        = float(fw / 2)
        self._missing        = 0
        self._memory_limit   = int(fps * cfg.get("memory_sec", 1.5))

        opts = FaceLandmarkerOpts(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=VisionRunningMode.VIDEO,
            num_faces=cfg["max_faces"],
            min_face_detection_confidence=0.4,
            min_face_presence_confidence=0.4,
            min_tracking_confidence=0.4,
        )
        self.landmarker = FaceLandmarker.create_from_options(opts)
        print(f"✅ Tracker ready (detect every {self.detect_every} frames)")

    def _score_face(self, lms, idx):
        raw_gap = abs(lms[LOWER_LIP].y - lms[UPPER_LIP].y) * self.fh
        lip_ema = self.alpha_lip * raw_gap + (1 - self.alpha_lip) * self._lip_ema.get(idx, 0.0)
        self._lip_ema[idx] = lip_ema

        xs = [lm.x * self.fw for lm in lms]
        ys = [lm.y * self.fh for lm in lms]
        fw_ = max(xs) - min(xs)
        fh_ = max(ys) - min(ys)

        if fw_ < self.fw * 0.05 or fh_ < self.fh * 0.03:
            return None, None          # edge sliver — discard

        cx    = (min(xs) + max(xs)) / 2
        area  = fw_ * fh_
        score = (lip_ema * 3.0 if lip_ema >= self.threshold else 0.0) + (area ** 0.5) * 0.01
        return score, cx

    def update(self, bgr_frame, frame_idx, ts_ms):
        if frame_idx % self.detect_every != 0:
            return

        rgb    = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        result = self.landmarker.detect_for_video(
            mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)

        if not result.face_landmarks:
            self._missing += 1
            if self._missing <= self._memory_limit:
                self.face_visible = True
                self.talking_cx   = int(round(self._cx_ema))
            else:
                self.face_visible = False
            return

        self._missing = 0
        best_score, best_cx = -1.0, None

        for i, lms in enumerate(result.face_landmarks):
            score, cx = self._score_face(lms, i)
            if score is not None and score > best_score:
                best_score, best_cx = score, cx

        if best_cx is None:
            self.face_visible = False
            return

        # Strong EMA on cx — this is the ONLY smoothing for position.
        # alpha_cx=0.15 means 85 % of last frame survives each update,
        # which at detect_every=0.5 s gives a very gentle glide.
        self._cx_ema = self.alpha_cx * best_cx + (1 - self.alpha_cx) * self._cx_ema
        self._last_cx     = self._cx_ema
        self.face_visible = True
        self.talking_cx   = int(round(self._cx_ema))

    def close(self):
        self.landmarker.close()


# ─── STABLE CAMERA ────────────────────────────────────────────────────────────
class StableCameraMotion:
    """
    Pure EMA crop — no jitter, no smoothstep oscillation.

    Design principles
    -----------------
    • ONE smoothing layer only (EMA on crop_x). The tracker already does
      EMA on face_cx, so two layers stacked caused the oscillation/shake.
    • Dead zone: don't update target at all if face barely moved.
    • Snap: if face teleports >35 % of frame width, snap instantly so the
      reframe reads as intentional rather than a slow drift.
    • No random noise — jitter was the main source of the visible shake.
    """

    def __init__(self, fw, fh, tw, smooth=0.07, dead_zone_px=35, snap_frac=0.35):
        self.fw          = fw
        self.tw          = tw
        self.dead_zone   = dead_zone_px
        self.snap_dist   = fw * snap_frac
        self.smooth      = smooth          # EMA alpha: lower = smoother/slower
        self._x          = float(fw // 2 - tw // 2)
        self._target     = self._x

    def set_target(self, face_cx):
        ideal = float(np.clip(face_cx - self.tw // 2, 0, self.fw - self.tw))
        dist  = abs(ideal - self._target)

        if dist < self.dead_zone:
            return                          # ignore micro-drift

        if dist > self.snap_dist:
            self._x      = ideal            # hard cut-snap
            self._target = ideal
            return

        self._target = ideal

    def step(self):
        # Single EMA step — produces a smooth deceleration curve naturally
        self._x += self.smooth * (self._target - self._x)
        return int(np.clip(round(self._x), 0, self.fw - self.tw))


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("🚀 Starting video processing task...")

    payload_str = os.environ.get("PROCESSING_PAYLOAD")
    if not payload_str:
        raise ValueError("❌ 'PROCESSING_PAYLOAD' env var missing.")

    payload          = json.loads(payload_str)
    bucket           = payload["s3_bucket"]
    input_key        = payload["s3_input_key"]
    output_key       = payload["s3_output_key"]
    audio_output_key = payload["s3_audio_output_key"]
    clip_info        = payload["clip_info"]
    webhook_url      = payload["webhook_url"]
    user_id          = payload["user_id"]
    req_id           = payload["req_id"]

    start_sec  = time_str_to_seconds(clip_info["start_time"])
    dur_sec    = int(clip_info["duration_seconds"])

    tmp_input = f"/tmp/input_{int(time.time())}.mp4"
    tmp_output = f"/tmp/output_{int(time.time())}.mp4"
    tmp_audio = f"/tmp/_audio_{int(time.time())}.flac"
    tmp_video = f"/tmp/_video_{int(time.time())}.mp4"

    try:
        # 1. Download ──────────────────────────────────────────────────────
        print(f"📥 Downloading s3://{bucket}/{input_key} ...")
        s3_client.download_file(bucket, input_key, tmp_input)

        # 2. Config ────────────────────────────────────────────────────────
        config = {
            "inputVideo": tmp_input,
            "outputReel": tmp_output,
            "startAt":    start_sec,
            "duration":   dur_sec,

            "tracking": {
                "lip_threshold_px":  2.5,
                "lip_ema_alpha":     0.4,
                "cx_ema_alpha":      0.12,  # strong smooth on face cx
                "max_faces":         4,
                "detect_every_sec":  0.5,
                "memory_sec":        1.5,
            },

            "camera": {
                "smooth":      0.06,    # EMA alpha for crop position (lower = smoother)
                "dead_zone":   40,      # px — ignore drift smaller than this
                "snap_frac":   0.35,    # fraction of frame width before hard snap
            },
        }

        # 3. Extract audio ─────────────────────────────────────────────────
        print("🎵 Extracting audio ...")
        (ffmpeg.input(config["inputVideo"])
               .filter("atrim",    start=config["startAt"], duration=config["duration"])
               .filter("asetpts",  "PTS-STARTPTS")
               .filter("aresample", 16000)
               .output(tmp_audio, acodec="flac", ac=1)
               .overwrite_output().run(quiet=True))

        # 4. Video setup ───────────────────────────────────────────────────
        cap = cv2.VideoCapture(config["inputVideo"])
        fps = cap.get(cv2.CAP_PROP_FPS)
        vw  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vh  = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        tw  = int(vh * 9 / 16)         # target crop width for 9:16

        cap.set(cv2.CAP_PROP_POS_FRAMES, int(config["startAt"] * fps))
        total_frames = int(config["duration"] * fps)

        out     = cv2.VideoWriter(tmp_video,
                                  cv2.VideoWriter_fourcc(*'mp4v'),
                                  fps, (tw, vh))
        tracker = AutoSpeakerTracker(vw, vh, fps, config["tracking"])
        cam_cfg = config["camera"]
        camera  = StableCameraMotion(
            fw=vw, fh=vh, tw=tw,
            smooth=cam_cfg["smooth"],
            dead_zone_px=cam_cfg["dead_zone"],
            snap_frac=cam_cfg["snap_frac"],
        )

        # 5. Frame loop ────────────────────────────────────────────────────
        print("🎬 Processing frames ...")
        
        face_intervals = clip_info.get("face_detection_intervals", [])

        for fi in range(total_frames):
            ret, frame = cap.read()
            if not ret:
                break

            current_sec_in_clip = fi / fps
            detect_face = True
            
            for interval in face_intervals:
                # interval.get("end_sec", 9999) handles cases where end_sec might be missing
                if interval.get("start_sec", 0) <= current_sec_in_clip <= interval.get("end_sec", 9999):
                    detect_face = interval.get("detect_face", True)
                    break

            ts_ms = int((config["startAt"] + current_sec_in_clip) * 1000)
            
            if detect_face:
                tracker.update(frame, fi, ts_ms)
            else:
                # Force tracker to skip and behave as if face is not visible
                tracker.face_visible = False
                tracker._missing = tracker._memory_limit + 1  # clear any lingering smooth-coast memory

            if tracker.face_visible:
                camera.set_target(tracker.talking_cx)
                crop_x = camera.step()
                out_frame = frame[0:vh, crop_x:crop_x + tw]
            else:
                camera.step()           # keep clock ticking for smooth resume
                canvas   = np.zeros((vh, tw, 3), dtype=np.uint8)
                scale    = tw / vw
                new_h    = int(vh * scale)
                resized  = cv2.resize(frame, (tw, new_h))
                y_off    = max(0, (vh - new_h) // 2)
                paste_h  = min(new_h, vh - y_off)
                canvas[y_off:y_off + paste_h, 0:tw] = resized[:paste_h]
                out_frame = canvas

            out.write(out_frame)

        tracker.close()
        cap.release()
        out.release()

        # 6. Composite ─────────────────────────────────────────────────────
        print("⚡ Compositing final render ...")
        v = ffmpeg.input(tmp_video)
        a = ffmpeg.input(tmp_audio)

        (ffmpeg.output(v, a, config["outputReel"],
                        vcodec="libx264",
                        preset="slow",             # Better quality per bitrate
                        crf=18,                    # Near-lossless quality
                        pix_fmt="yuv420p",         # Maximum compatibility
                        profile="high",
                        level="4.2",
                        acodec="aac",
                        audio_bitrate="320k",
                        ar=48000,                  # Standard audio sample rate
                        movflags="+faststart",
                        threads=0
                        )
               .overwrite_output().run(quiet=True))

        print(f"🎉 Done → {config['outputReel']}")

        # 7. Upload ────────────────────────────────────────────────────────
        print(f"📤 Uploading to s3://{bucket}/{output_key} ...")
        s3_client.upload_file(config["outputReel"], bucket, output_key)
        s3_client.upload_file(tmp_audio, bucket, audio_output_key)
        region = s3_client.meta.region_name
        constant_url = f"https://{bucket}.s3.{region}.amazonaws.com/{output_key}"
        print(f"🔗 URL: {constant_url}")

        send_status_webhook(webhook_url, "completed",
                            video_url=constant_url, user_id=user_id, req_id=req_id)

    except Exception as e:
        print(f"❌ Critical failure: {e}")
        send_status_webhook(webhook_url, "failed",
                            user_id=user_id, req_id=req_id, error_msg=str(e))
        raise

    finally:
        print("🧹 Cleaning up ...")
        for f in [tmp_input, tmp_output, tmp_audio, tmp_video]:
            if f and os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        print("🏁 Done.")


if __name__ == "__main__":
    main()