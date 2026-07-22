import json
import os
import boto3
import time
import subprocess
import requests

# Initialize AWS S3 Client
s3_client = boto3.client('s3')

def send_status_webhook(url, status, req_id=None, video_url=None, error_msg=None):
    if not url:
        print("⚠️ No webhook_url — skipping callback.")
        return
    body = {
        "req_id": req_id, 
        "status": status, 
        "video_url": video_url, 
        "error": error_msg
    }
    try:
        r = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=15)
        print(f"{'✅' if r.status_code < 300 else '⚠️'} Webhook {r.status_code}")
    except Exception as e:
        print(f"❌ Webhook failed: {e}")

def main():
    print("🚀 Starting ECS Video Compression Task...")

    # 1. Fetch the Payload from S3 (This was passed by your Lambda)
    payload_s3_key = os.environ.get("PAYLOAD_S3_KEY")
    payload_s3_bucket = os.environ.get("PAYLOAD_S3_BUCKET")
    
    if not payload_s3_key or not payload_s3_bucket:
        raise ValueError("❌ Missing PAYLOAD_S3_KEY or PAYLOAD_S3_BUCKET environment variables.")

    print(f"📥 Downloading payload from s3://{payload_s3_bucket}/{payload_s3_key} ...")
    response = s3_client.get_object(Bucket=payload_s3_bucket, Key=payload_s3_key)
    payload = json.loads(response['Body'].read().decode('utf-8'))

    req_id = payload.get("req_id", "default_req")
    bucket = payload.get("s3_bucket")
    input_key = payload.get("s3_input_key")
    output_key = payload.get("s3_output_key")
    audio_key = payload.get("s3_audio_key")
    webhook_url = payload.get("webhook_url")
    
    # Send an initial 'processing' webhook if needed
    send_status_webhook(webhook_url, "processing", req_id=req_id)

    local_input_path = f"/tmp/input_{req_id}.mp4"
    local_compressed_path = f"/tmp/compressed_{req_id}.mp4"
    local_audio_path = f"/tmp/audio_{req_id}.mp3"

    try:
        # 2. Download the raw video from S3
        print(f"📥 Downloading s3://{bucket}/{input_key} to {local_input_path}...")
        s3_client.download_file(bucket, input_key, local_input_path)
        
        # 2.5 Extract audio if requested
        if audio_key:
            print("🎵 Extracting audio...")
            audio_command = ["ffmpeg", "-y", "-nostdin", "-i", local_input_path, "-vn", "-c:a", "libmp3lame", "-q:a", "2", local_audio_path]
            print(f"🎬 Executing: {' '.join(audio_command)}")
            process_audio = subprocess.run(audio_command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if process_audio.returncode != 0:
                print(f"⚠️ Audio extraction failed: {process_audio.stderr.decode('utf-8')}")
            else:
                print(f"📤 Uploading audio to S3: {audio_key}")
                s3_client.upload_file(local_audio_path, bucket, audio_key)
        
        # 3. Compress and Convert to MP4 using FFmpeg
        print("⚙️ Starting FFmpeg compression...")
        
        # Build the base command
        ffmpeg_command = ["ffmpeg", "-y", "-nostdin", "-i", local_input_path]
        
        # Fetch dynamic commands from payload
        custom_ffmpeg_commands = payload.get("ffmpeg_commands")
        
        if custom_ffmpeg_commands and isinstance(custom_ffmpeg_commands, list) and len(custom_ffmpeg_commands) > 0:
            # If the webserver passed an array like ["-c:v", "libx264", "-crf", "30"]
            ffmpeg_command.extend([str(arg) for arg in custom_ffmpeg_commands])
        elif custom_ffmpeg_commands and isinstance(custom_ffmpeg_commands, dict) and len(custom_ffmpeg_commands) > 0:
            # If the webserver passed an object like {"-c:v": "libx264", "-crf": "30"}
            for key, val in custom_ffmpeg_commands.items():
                if not str(key).startswith("-"):
                    key = "-" + str(key)
                ffmpeg_command.append(str(key))
                if val is not None and str(val).strip() != "":
                    ffmpeg_command.append(str(val))
        else:
            # Fallback to default compression settings
            ffmpeg_command.extend([
                "-c:v", "libx264",           
                "-crf", "28",                
                "-preset", "faster",         
                "-c:a", "aac",               
                "-b:a", "128k"
            ])
            
        # Finally, append the output path
        ffmpeg_command.append(local_compressed_path)
        
        print(f"🎬 Executing: {' '.join(ffmpeg_command)}")
        
        process = subprocess.run(
            ffmpeg_command, 
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.PIPE
        )
        
        if process.returncode != 0:
            raise Exception(f"FFmpeg failed: {process.stderr.decode('utf-8')}")
            
        print("✅ FFmpeg compression successful!")
        
        # 4. Upload Compressed Video Back to S3
        print(f"📤 Uploading compressed video to S3: {output_key}")
        s3_client.upload_file(local_compressed_path, bucket, output_key)
        
        # Determine the public URL of the compressed video
        region = s3_client.meta.region_name or 'us-east-1'
        compressed_video_url = f"https://{bucket}.s3.{region}.amazonaws.com/{output_key}"
        
        print(f"🔗 Video URL: {compressed_video_url}")

        # 5. Fire the Webhook to notify your Next.js app!
        send_status_webhook(webhook_url, "completed", req_id=req_id, video_url=compressed_video_url)
        
        print("🎉 Task completed successfully!")

    except Exception as e:
        print(f"❌ Critical error processing video: {str(e)}")
        # Send a failed webhook
        send_status_webhook(webhook_url, "failed", req_id=req_id, error_msg=str(e))
        raise e

    finally:
        # 6. Cleanup local /tmp/ files
        if os.path.exists(local_input_path):
            os.remove(local_input_path)
        if os.path.exists(local_compressed_path):
            os.remove(local_compressed_path)
        if 'local_audio_path' in locals() and os.path.exists(local_audio_path):
            os.remove(local_audio_path)

if __name__ == "__main__":
    main()