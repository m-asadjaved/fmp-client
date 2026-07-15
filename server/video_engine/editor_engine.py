import os
import time
import cv2
import numpy as np
import ffmpeg
import json
import requests
import boto3
import wave
from collections import deque
import sys

# Import face detector logic
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'face_detector'))
from face_detector import (
    ensure_yunet_model, YuNetDetector, FaceTracker, YUNET_INPUT_SIZE, YUNET_NMS_THRESHOLD,
    normalize_lighting, USE_LIGHTING_NORMALIZATION, USE_LANDMARK_VALIDATION, landmarks_plausible,
    USE_BLUR_REJECTION, blur_score, BlurBaseline, ask_gemini_multiple_people,
    compute_person_crop_box_from_data, apply_face_zoom_crop, apply_wide_fit_blur, default_center_crop_box, SmoothedCrop
)


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


# Initialize AWS S3 Client
s3_client = boto3.client('s3')

# ─── AUDIO VOLUME HELPER ──────────────────────────────────────────────────────
def get_audio_energy_at(audio_arr, sample_rate, t_sec, window_sec=0.15):
    """RMS energy in a small window centered on t_sec."""
    center = int(t_sec * sample_rate)
    half = int(window_sec * sample_rate / 2)
    start = max(0, center - half)
    end = min(len(audio_arr), center + half)
    if end <= start:
        return 0.0
    chunk = audio_arr[start:end]
    return float(np.sqrt(np.mean(chunk.astype(np.float64) ** 2)))

def extract_audio_array(tmp_input, start_sec, duration_sec, sample_rate=16000):
    """Extracts audio for a specific chunk and returns raw samples as np.float32 array"""
    tmp_wav = f"/tmp/_audio_analysis_{int(time.time()*1000)}.wav"
    (ffmpeg.input(tmp_input)
           .filter("atrim", start=start_sec, duration=duration_sec)
           .filter("asetpts", "PTS-STARTPTS")
           .output(tmp_wav, ac=1, ar=sample_rate)
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
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration_sec = frame_count / fps if fps > 0 else 0

        print(f"🎥 Source video: {vw}x{vh} @ {fps}fps | frames={frame_count} | duration≈{video_duration_sec:.1f}s")

        max_requested_sec = max(float(e["source_end_sec"]) for e in edits)
        if max_requested_sec > video_duration_sec + 1.0:
            raise ValueError(
                f"Edits request up to {max_requested_sec:.1f}s but downloaded video "
                f"'{input_key}' is only {video_duration_sec:.1f}s ({frame_count} frames @ {fps}fps). "
                f"The S3 raw video and the Gemini-analyzed video are out of sync — "
                f"check gemini_file_uri vs raw_videos/{{videoId}}.mp4."
            )
        
        # Output is standard 9:16 vertical video
        out_w = int(vh * 9 / 16)
        # Ensure dimensions are even numbers (required by h264/mp4v codecs)
        if out_w % 2 != 0:
            out_w += 1
        out_h = vh

        print(f"🎥 Source video: {vw}x{vh} @ {fps}fps. Target output: {out_w}x{out_h}")

        # Ensure model is ready
        yunet_path = ensure_yunet_model("/tmp/face_detection_yunet.onnx")
        yunet = YuNetDetector(yunet_path, YUNET_INPUT_SIZE, score_threshold=0.3, nms_threshold=YUNET_NMS_THRESHOLD)


        clip_video_files = []
        clip_audio_files = []

        # ─── LOOP THROUGH EDITS (JSON TIMELINE) ───
        for idx, edit in enumerate(edits):
            start_sec = float(edit["source_start_sec"])
            end_sec = float(edit["source_end_sec"])
            duration_sec = end_sec - start_sec
            print(f"🎬 Processing Edit {idx+1}/{len(edits)}: {start_sec}s - {end_sec}s")

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
            audio_arr = extract_audio_array(tmp_input, start_sec, duration_sec)

            # Setup video writer for this clip chunk
            out = cv2.VideoWriter(tmp_clip_video, cv2.VideoWriter_fourcc(*'mp4v'), fps, (out_w, out_h))
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(start_sec * fps))
            frames_to_read = int(duration_sec * fps)
            frames_written = 0

            # --- PASS 1: TRACKING FOR THIS CLIP ---
            print(f"🔎 Tracking faces for Edit {idx+1}...")
            tracker = FaceTracker(frame_width=vw)
            blur_baseline = BlurBaseline(fps)
            frame_records = []
            next_gemini_check_frame = 0
            gemini_wide_lock_until = -1
            
            for fi in range(frames_to_read):
                ret, frame = cap.read()
                if not ret: break
                
                detect_input = normalize_lighting(frame) if USE_LIGHTING_NORMALIZATION else frame
                all_raw_detections = yunet.detect(detect_input)
                
                raw_detections = []
                weak_detections = []
                for d in all_raw_detections:
                    if d["confidence"] >= 0.7:  # YUNET_SCORE_THRESHOLD
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
                    
                blur_baseline.maybe_finalize(fi)
                all_tracks = tracker.update(raw_detections, frame=frame)
                active_tracks = [t for t in all_tracks if t.is_confirmed]
                
                if len(active_tracks) == 1 and len(weak_detections) > 0:
                    if fi >= next_gemini_check_frame:
                        is_multiple = ask_gemini_multiple_people(frame)
                        if is_multiple:
                            gemini_wide_lock_until = fi + int(fps * 2.0)
                        next_gemini_check_frame = fi + int(fps * 2.0)
                
                if fi < gemini_wide_lock_until:
                    frame_records.append([{"id": -1, "box": (0,0,0,0)}, {"id": -2, "box": (0,0,0,0)}])
                else:
                    frame_records.append([{"id": t.id, "box": t.smoothed_box} for t in active_tracks])

            total_frames = len(frame_records)
            
            # ═══ Compute mode decisions ═══
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
                
            # --- PASS 2: RENDERING FOR THIS CLIP ---
            print(f"🎬 Rendering Edit {idx+1}...")
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(start_sec * fps))
            
            default_crop = default_center_crop_box(vw, vh, 9.0/16.0)
            smoothed_crop = SmoothedCrop(default_crop)
            render_mode = "wide"
            mode_blend = 1.0
            MODE_BLEND_STEP = 1.0 / max(1, int(round(fps * 0.5)))
            
            for fi in range(frames_to_read):
                if fi >= total_frames:
                    break
                ret, frame = cap.read()
                if not ret: break

                ts_ms = int((start_sec + (fi / fps)) * 1000)
                t_in_clip = fi / fps
                audio_energy = get_audio_energy_at(audio_arr, 16000, t_in_clip)

                active_tracks_data = frame_records[fi]
                this_mode = final_mode[fi]
                this_target = final_target[fi]

                if this_mode != render_mode:
                    mode_blend = 0.0
                    render_mode = this_mode

                target_data = next((t for t in active_tracks_data if t["id"] == this_target), None)
                if target_data is not None:
                    target_crop = compute_person_crop_box_from_data(target_data["box"], vw, vh, 9.0/16.0)
                elif active_tracks_data:
                    fallback = max(active_tracks_data, key=lambda t: t["box"][2] * t["box"][3])
                    target_crop = compute_person_crop_box_from_data(fallback["box"], vw, vh, 9.0/16.0)
                else:
                    target_crop = default_crop

                crop_box = smoothed_crop.update(target_crop)
                pan_frame = apply_face_zoom_crop(frame, crop_box, (out_w, out_h))
                
                if render_mode == "wide" or mode_blend < 1.0:
                    if use_bg_blur:
                        wide_frame = apply_wide_fit_blur(frame, (out_w, out_h))
                    else:
                        # Fallback for wide if no blur: black padding
                        scale = out_w / vw
                        new_h = int(vh * scale)
                        resized = cv2.resize(frame, (out_w, new_h))
                        y_offset = (out_h - new_h) // 2
                        wide_frame = np.zeros((out_h, out_w, 3), dtype=np.uint8)
                        wide_frame[y_offset:y_offset+new_h, 0:out_w] = resized
                else:
                    wide_frame = None

                if render_mode == "single_character" and mode_blend >= 1.0:
                    output_frame = pan_frame
                elif render_mode == "wide" and mode_blend >= 1.0:
                    output_frame = wide_frame
                else:
                    target_frame = wide_frame if render_mode == "wide" else pan_frame
                    other_frame = pan_frame if render_mode == "wide" else wide_frame
                    blend_step = 1.0 if render_mode == "wide" else MODE_BLEND_STEP
                    output_frame = cv2.addWeighted(other_frame, 1.0 - mode_blend, target_frame, mode_blend, 0)
                    mode_blend = min(1.0, mode_blend + blend_step)

                out.write(output_frame)
                frames_written += 1

            out.release()
            if frames_written > 0:
                clip_video_files.append(tmp_clip_video)
            else:
                print(f"⚠️ Warning: Edit {idx+1} produced 0 frames and was skipped.")

        cap.release()

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

        try:
            # Concatenate video streams without re-encoding
            (ffmpeg.input(concat_file_path, format='concat', safe=0)
                   .output(tmp_stitched_video, c='copy')
                   .overwrite_output().run(capture_stdout=True, capture_stderr=True))
                   
            # Concatenate audio streams and convert to FLAC for Remotion
            (ffmpeg.input(concat_audio_path, format='concat', safe=0)
                   .output(output_audio, acodec="flac", ac=1)
                   .overwrite_output().run(capture_stdout=True, capture_stderr=True))
    
            print("⚡ Compositing final render with audio ...")
            v = ffmpeg.input(tmp_stitched_video)
            a = ffmpeg.input(output_audio)
    
            (ffmpeg.output(v, a, output_reel,
                            vcodec="libx264", preset="slow", crf=18, pix_fmt="yuv420p",
                            profile="high", level="4.2", acodec="aac", audio_bitrate="320k",
                            ar=48000, movflags="+faststart", threads=0)
                   .overwrite_output().run(capture_stdout=True, capture_stderr=True))
        except ffmpeg.Error as e:
            print(f"FFmpeg Error Stderr:\n{e.stderr.decode('utf-8')}")
            raise

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
