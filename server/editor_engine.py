import os
import time
import cv2
import numpy as np
import ffmpeg
import json
import requests
import boto3
import wave

# ─── MEDIAPIPE INITIALIZATION ─────────────────────────────────────────────────
import mediapipe as mp
from mediapipe.tasks.python import vision as mp_vision

BaseOptions         = mp.tasks.BaseOptions
FaceLandmarker      = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOpts  = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode   = mp.tasks.vision.RunningMode

# Swap to /var/task/face_landmarker.task in production ECS/Lambda
MODEL_PATH = os.environ.get("MODEL_PATH", "face_landmarker.task")
print(f"✅ MediaPipe {mp.__version__} ready | model: {MODEL_PATH}")

UPPER_LIP = 13
LOWER_LIP = 14

# Initialize AWS S3 Client
s3_client = boto3.client('s3')

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def time_str_to_seconds(t):
    if isinstance(t, (int, float)): return float(t)
    p = list(map(int, t.split(':')))
    return p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]

def send_status_webhook(url, status, video_url=None, user_id=None, req_id=None, error_msg=None):
    if not url:
        print("⚠️ No webhook_url — skipping callback.")
        return
    body = {"req_id": req_id, "status": status, "video_url": video_url, "user_id": user_id, "error": error_msg}
    try:
        r = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=15)
        print(f"{'✅' if r.status_code < 300 else '⚠️'} Webhook {r.status_code}")
    except Exception as e:
        print(f"❌ Webhook failed: {e}")

# ─── FACE TRACKER ─────────────────────────────────────────────────────────────
class AutoSpeakerTracker:
    def __init__(self, fw, fh, fps, cfg):
        self.fw, self.fh = fw, fh
        self.threshold = cfg["lip_threshold_px"]
        self.alpha_lip = cfg["lip_ema_alpha"]
        self.alpha_cx = cfg.get("cx_ema_alpha", 0.15)
        self.detect_every = max(1, int(fps * cfg["detect_every_sec"]))
        self._lip_ema = {}
        self._cx_ema = float(fw / 2)
        self.face_visible = False
        self.talking_cx = fw // 2
        self._last_cx = float(fw / 2)
        self._missing = 0
        self._memory_limit = int(fps * cfg.get("memory_sec", 1.5))
        self.locked_center = None

        opts = FaceLandmarkerOpts(
            base_options=BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=VisionRunningMode.VIDEO,
            num_faces=cfg["max_faces"],
            min_face_detection_confidence=0.4,
            min_face_presence_confidence=0.4,
            min_tracking_confidence=0.4,
        )
        self.landmarker = FaceLandmarker.create_from_options(opts)

    def _score_face(self, lms, idx, audio_volume=1.0, speaker_bbox=None, locked_center=None):
        raw_gap = abs(lms[LOWER_LIP].y - lms[UPPER_LIP].y) * self.fh
        lip_ema = self.alpha_lip * raw_gap + (1 - self.alpha_lip) * self._lip_ema.get(idx, 0.0)
        self._lip_ema[idx] = lip_ema

        xs = [lm.x for lm in lms]
        ys = [lm.y for lm in lms]
        fw_norm = max(xs) - min(xs)
        fh_norm = max(ys) - min(ys)
        fw_px = fw_norm * self.fw
        fh_px = fh_norm * self.fh

        if fw_px < self.fw * 0.05 or fh_px < self.fh * 0.03:
            return None, None, None, None

        cx_norm = (min(xs) + max(xs)) / 2.0
        cy_norm = (min(ys) + max(ys)) / 2.0
        cx_px = cx_norm * self.fw

        area = fw_px * fh_px
        effective_lip_score = lip_ema * 3.0 * audio_volume if lip_ema >= self.threshold else 0.0
        score = effective_lip_score + (area ** 0.5) * 0.01

        if locked_center is not None:
            lock_dist = ((cx_norm - locked_center[0])**2 + (cy_norm - locked_center[1])**2)**0.5
            if lock_dist < 0.15:
                score += (0.2 - lock_dist) * 2000.0
        elif speaker_bbox and len(speaker_bbox) == 4:
            gem_ymin, gem_xmin, gem_ymax, gem_xmax = [v / 1000.0 for v in speaker_bbox]
            gem_cx = (gem_xmin + gem_xmax) / 2.0
            gem_cy = (gem_ymin + gem_ymax) / 2.0
            dist = ((cx_norm - gem_cx)**2 + (cy_norm - gem_cy)**2)**0.5
            score += (1.5 - dist) * 500.0

        return score, cx_px, cx_norm, cy_norm

    def update(self, bgr_frame, frame_idx, ts_ms, audio_volume=1.0, speaker_bbox=None, is_new_interval=False):
        if frame_idx % self.detect_every != 0: return
        if is_new_interval: self.locked_center = None
        
        rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        result = self.landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)

        if not result.face_landmarks:
            self._missing += 1
            if self._missing <= self._memory_limit:
                self.face_visible = True
                self.talking_cx = int(round(self._cx_ema))
            else:
                self.face_visible = False
                self.locked_center = None
            return

        self._missing = 0
        self.face_visible = True
        best_score = -1.0
        best_cx = self._last_cx
        best_norm_cx = None
        best_norm_cy = None

        for idx, lms in enumerate(result.face_landmarks):
            score, cx_px, norm_cx, norm_cy = self._score_face(lms, idx, audio_volume=audio_volume, speaker_bbox=speaker_bbox, locked_center=getattr(self, 'locked_center', None))
            if score is None: continue
            if score > best_score:
                best_score = score
                best_cx = cx_px
                best_norm_cx = norm_cx
                best_norm_cy = norm_cy
                
        if best_norm_cx is not None:
            self.locked_center = (best_norm_cx, best_norm_cy)

        if best_score < 0:
            self.face_visible = False
            return

        self._cx_ema = self.alpha_cx * best_cx + (1 - self.alpha_cx) * self._cx_ema
        self._last_cx = self._cx_ema
        self.face_visible = True
        self.talking_cx = int(round(self._cx_ema))

    def close(self):
        self.landmarker.close()


# ─── STABLE CAMERA ────────────────────────────────────────────────────────────
class StableCameraMotion:
    def __init__(self, fw, fh, tw, smooth=0.07, dead_zone_px=35, snap_frac=0.35):
        self.fw = fw
        self.tw = tw
        self.dead_zone = dead_zone_px
        self.snap_dist = fw * snap_frac
        self.smooth = smooth
        self._x = float(fw // 2 - tw // 2)
        self._target = self._x

    def set_target(self, face_cx):
        ideal = float(np.clip(face_cx - self.tw // 2, 0, self.fw - self.tw))
        dist = abs(ideal - self._target)
        if dist < self.dead_zone: return
        if dist > self.snap_dist:
            self._x = ideal; self._target = ideal
            return
        self._target = ideal

    def step(self):
        self._x += self.smooth * (self._target - self._x)
        return int(np.clip(round(self._x), 0, self.fw - self.tw))

# ─── AUDIO VOLUME HELPER ──────────────────────────────────────────────────────
def get_audio_volume(tmp_input, start_sec, duration_sec):
    """Extracts audio for a specific chunk and returns a volume array per frame"""
    tmp_wav = f"/tmp/_audio_analysis_{int(time.time()*1000)}.wav"
    (ffmpeg.input(tmp_input)
           .filter("atrim", start=start_sec, duration=duration_sec)
           .filter("asetpts", "PTS-STARTPTS")
           .output(tmp_wav, ac=1, ar=16000)
           .overwrite_output().run(quiet=True))
    
    try:
        with wave.open(tmp_wav, 'rb') as w:
            nframes = w.getnframes()
            audio_data = w.readframes(nframes)
            audio_arr = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
        os.remove(tmp_wav)
        return audio_arr
    except Exception as e:
        print(f"⚠️ Audio analysis failed: {e}")
        return np.zeros(0)

# ─── MAIN JSON EDITOR ENGINE ──────────────────────────────────────────────────
def main():
    print("🚀 Starting JSON-driven Video Editor Engine...")

    payload_s3_key = os.environ.get("PAYLOAD_S3_KEY")
    payload_s3_bucket = os.environ.get("PAYLOAD_S3_BUCKET")
    
    if payload_s3_key and payload_s3_bucket:
        print(f"📥 Downloading payload from s3://{payload_s3_bucket}/{payload_s3_key} ...")
        response = s3_client.get_object(Bucket=payload_s3_bucket, Key=payload_s3_key)
        payload_str = response['Body'].read().decode('utf-8')
    else:
        payload_str = os.environ.get("PROCESSING_PAYLOAD")
        
    if not payload_str:
        raise ValueError("❌ Neither S3 payload config nor 'PROCESSING_PAYLOAD' env var found.")

    payload = json.loads(payload_str)
    bucket = payload.get("s3_bucket")
    input_key = payload.get("s3_input_key")
    output_key = payload.get("s3_output_key")
    audio_output_key = payload.get("s3_audio_output_key")
    webhook_url = payload.get("webhook_url")
    user_id = payload.get("user_id")
    req_id = payload.get("req_id")
    preferences = payload.get("preferences", {})
    use_bg_blur = preferences.get("backgroundBlur", True)
    editor_timeline = payload.get("editor_timeline", {})
    clip_info = payload.get("clip_info", {})
    
    # Fallback to clip_info["edits"] in case the AWS Trigger Lambda strips unknown root fields
    edits = editor_timeline.get("edits") or clip_info.get("edits", [])

    if not edits:
        raise ValueError("❌ No edits found in editor_timeline.edits or clip_info.edits")

    tmp_input = f"/tmp/input_{int(time.time())}.mp4"
    output_reel = f"/tmp/output_{int(time.time())}.mp4"
    output_audio = f"/tmp/_audio_{int(time.time())}.flac"

    files_to_cleanup = [tmp_input, output_reel, output_audio]

    try:
        print(f"📥 Downloading s3://{bucket}/{input_key} ...")
        s3_client.download_file(bucket, input_key, tmp_input)

        cap = cv2.VideoCapture(tmp_input)
        fps = cap.get(cv2.CAP_PROP_FPS)
        vw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Output is standard 9:16 vertical video
        out_w = int(vh * 9 / 16) 
        out_h = vh

        print(f"🎥 Source video: {vw}x{vh} @ {fps}fps. Target output: {out_w}x{out_h}")

        tracker = AutoSpeakerTracker(vw, vh, fps, {
            "lip_threshold_px": 2.5, "lip_ema_alpha": 0.4, "cx_ema_alpha": 0.12, 
            "max_faces": 4, "detect_every_sec": 0.5, "memory_sec": 1.5
        })

        clip_video_files = []
        clip_audio_files = []

        # ─── LOOP THROUGH EDITS (JSON TIMELINE) ───
        for idx, edit in enumerate(edits):
            start_sec = float(edit["source_start_sec"])
            end_sec = float(edit["source_end_sec"])
            duration_sec = end_sec - start_sec
            action = edit.get("action", "track_face")
            zoom_level = float(edit.get("zoom_level", 1.0))
            
            print(f"🎬 Processing Edit {idx+1}/{len(edits)}: {start_sec}s - {end_sec}s | Action: {action} | Zoom: {zoom_level}")

            # Define crop dimensions for this clip based on zoom
            # E.g. Zoom 1.5 makes the crop box 1.5x smaller, which looks "zoomed in" when resized to out_w, out_h
            crop_w = int(out_w / zoom_level)
            crop_h = int(out_h / zoom_level)

            camera = StableCameraMotion(fw=vw, fh=vh, tw=crop_w, smooth=0.06, dead_zone_px=40, snap_frac=0.35)
            
            tmp_clip_video = f"/tmp/clip_{idx}_{int(time.time())}.mp4"
            tmp_clip_audio = f"/tmp/clip_{idx}_{int(time.time())}.wav"
            
            files_to_cleanup.extend([tmp_clip_video, tmp_clip_audio])
            
            # Extract audio exactly for this edit's duration
            (ffmpeg.input(tmp_input)
                   .filter("atrim", start=start_sec, duration=duration_sec)
                   .filter("asetpts", "PTS-STARTPTS")
                   .output(tmp_clip_audio, ac=1, ar=48000)
                   .overwrite_output().run(quiet=True))
            clip_audio_files.append(tmp_clip_audio)

            # Get volume array for lip sync tracking
            audio_arr = get_audio_volume(tmp_input, start_sec, duration_sec)

            # Setup video writer for this clip chunk
            out = cv2.VideoWriter(tmp_clip_video, cv2.VideoWriter_fourcc(*'mp4v'), fps, (out_w, out_h))
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(start_sec * fps))
            frames_to_read = int(duration_sec * fps)

            # Process frame by frame
            for fi in range(frames_to_read):
                ret, frame = cap.read()
                if not ret: break

                ts_ms = int((start_sec + (fi / fps)) * 1000)
                vol_idx = min(fi * 16000 // int(fps), len(audio_arr) - 1)
                audio_volume = audio_arr[vol_idx] if len(audio_arr) > 0 else 0.0

                if action == "fit_screen":
                    # Resize original frame to fit width (maintaining 16:9 aspect ratio)
                    scale = out_w / vw
                    new_h = int(vh * scale)
                    resized = cv2.resize(frame, (out_w, new_h))
                    y_offset = (out_h - new_h) // 2
                    
                    if use_bg_blur:
                        # Fast blurred background from the center crop of the frame
                        center_x = vw // 2
                        half_w = out_w // 2
                        if out_w <= vw:
                            bg = frame[:, center_x-half_w : center_x-half_w+out_w]
                        else:
                            bg = cv2.resize(frame, (out_w, out_h))
                        # Blur it heavily
                        out_frame = cv2.GaussianBlur(bg, (51, 51), 0)
                    else:
                        out_frame = np.zeros((out_h, out_w, 3), dtype=np.uint8)
                    
                    # Overlay resized frame onto the background
                    out_frame[y_offset:y_offset+new_h, 0:out_w] = resized
                else:
                    if action == "track_face":
                        bbox = edit.get("speaker_bbox_hint")
                        # Force new interval on first frame to reset lock
                        tracker.update(frame, fi, ts_ms, audio_volume=audio_volume, speaker_bbox=bbox, is_new_interval=(fi==0))
                        if tracker.face_visible:
                            camera.set_target(tracker.talking_cx)
                        else:
                            camera.step()
                    elif action == "static_zoom":
                        target_x_norm = edit.get("target_center_x", 0.5)
                        camera.set_target(int(target_x_norm * vw))
                    
                    crop_x = camera.step()
                    
                    # Y cropping logic: default to center or top-aligned based on JSON
                    target_y_norm = edit.get("target_center_y", 0.5)
                    crop_y = int((target_y_norm * vh) - (crop_h / 2))
                    crop_y = np.clip(crop_y, 0, vh - crop_h)

                    cropped_frame = frame[crop_y:crop_y + crop_h, crop_x:crop_x + crop_w]
                    
                    # Resize cropped frame back to out_w, out_h so all clips have exact same dimensions for concatenation
                    if zoom_level != 1.0:
                        out_frame = cv2.resize(cropped_frame, (out_w, out_h), interpolation=cv2.INTER_LINEAR)
                    else:
                        out_frame = cropped_frame

                out.write(out_frame)

            out.release()
            clip_video_files.append(tmp_clip_video)

        cap.release()
        tracker.close()

        # ─── CONCATENATE CLIPS ───
        print("⚡ Concatenating all processed clips ...")
        
        # FFmpeg requires a text file with a list of files to concat
        concat_file_path = f"/tmp/concat_{int(time.time())}.txt"
        with open(concat_file_path, "w") as f:
            for cv in clip_video_files:
                f.write(f"file '{cv}'\n")
        
        concat_audio_path = f"/tmp/concat_audio_{int(time.time())}.txt"
        with open(concat_audio_path, "w") as f:
            for ca in clip_audio_files:
                f.write(f"file '{ca}'\n")

        files_to_cleanup.extend([concat_file_path, concat_audio_path])

        tmp_stitched_video = f"/tmp/stitched_video_{int(time.time())}.mp4"
        files_to_cleanup.append(tmp_stitched_video)

        # Concatenate video streams without re-encoding
        (ffmpeg.input(concat_file_path, format='concat', safe=0)
               .output(tmp_stitched_video, c='copy')
               .overwrite_output().run(quiet=True))
               
        # Concatenate audio streams and convert to FLAC for Remotion
        (ffmpeg.input(concat_audio_path, format='concat', safe=0)
               .output(output_audio, acodec="flac", ac=1)
               .overwrite_output().run(quiet=True))

        print("⚡ Compositing final render with audio ...")
        v = ffmpeg.input(tmp_stitched_video)
        a = ffmpeg.input(output_audio)

        (ffmpeg.output(v, a, output_reel,
                        vcodec="libx264", preset="slow", crf=18, pix_fmt="yuv420p",
                        profile="high", level="4.2", acodec="aac", audio_bitrate="320k",
                        ar=48000, movflags="+faststart", threads=0)
               .overwrite_output().run(quiet=True))

        print(f"🎉 Done → {output_reel}")

        # ─── UPLOAD ───
        print(f"📤 Uploading to s3://{bucket}/{output_key} ...")
        s3_client.upload_file(output_reel, bucket, output_key)
        s3_client.upload_file(output_audio, bucket, audio_output_key)
        
        region = s3_client.meta.region_name or 'us-east-1'
        constant_url = f"https://{bucket}.s3.{region}.amazonaws.com/{output_key}"
        print(f"🔗 URL: {constant_url}")

        send_status_webhook(webhook_url, "completed", video_url=constant_url, user_id=user_id, req_id=req_id)

    except Exception as e:
        print(f"❌ Critical failure: {e}")
        send_status_webhook(webhook_url, "failed", user_id=user_id, req_id=req_id, error_msg=str(e))
        raise

    finally:
        print("🧹 Cleaning up ...")
        for f in files_to_cleanup:
            if f and os.path.exists(f):
                try: os.remove(f)
                except Exception: pass
        print("🏁 Done.")

if __name__ == "__main__":
    main()
