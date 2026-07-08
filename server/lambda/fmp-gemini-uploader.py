import json
import os
import boto3
import time
import urllib.parse
from supabase import create_client, Client
from google import genai

# Initialize AWS S3 Client
s3_client = boto3.client('s3')

# Initialize Google Gemini Client
ai = genai.Client()

# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def lambda_handler(event, context):
    try:
        # Handle CORS Preflight for API Gateway if needed
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200, 
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }, 
                "body": ""
            }

        # Determine if this was triggered via S3 Event or API Gateway POST
        if 'Records' in event and 's3' in event['Records'][0]:
            # S3 Trigger Mode
            record = event['Records'][0]
            bucket_name = record['s3']['bucket']['name']
            object_key = urllib.parse.unquote_plus(record['s3']['object']['key'])
            video_id = object_key.split('/')[-1].split('.')[0]
        else:
            # API Gateway POST Mode
            body = event.get("body", "{}")
            if isinstance(body, str):
                body = json.loads(body)
            bucket_name = body.get("s3_bucket")
            object_key = body.get("s3_key")  # Make sure you send the COMPRESSED video key (e.g., compressed_raw_videos/123.mp4)
            video_id = body.get("video_id") or object_key.split('/')[-1].split('.')[0]
            
            if not bucket_name or not object_key:
                raise ValueError("Missing s3_bucket or s3_key in request body.")

        print(f"Triggered for file: {object_key} in bucket: {bucket_name}")
        
        # 1. Setup /tmp/ paths
        filename = object_key.split('/')[-1]
        local_input_path = f"/tmp/{filename}"
        
        # 2. Download the video from S3
        print(f"Downloading {filename} from S3...")
        s3_client.download_file(bucket_name, object_key, local_input_path)
        
        # 3. Upload to Google Gemini File API
        print("Uploading to Google Gemini File API...")
        myfile = ai.files.upload(file=local_input_path, config={'mime_type': 'video/mp4'})
        
        # 4. Wait for Google to finish processing the video
        print("Waiting for Google to process the video...")
        while not myfile.state or myfile.state.name != "ACTIVE":
            print(f"Current state: {myfile.state.name if myfile.state else 'PROCESSING'}")
            if myfile.state and myfile.state.name == "FAILED":
                raise Exception("Google File API processing failed.")
            time.sleep(5)
            myfile = ai.files.get(name=myfile.name)
            
        print(f"Video Active! Gemini File URI: {myfile.uri}")
        
        # 5. Save the Gemini URI to Supabase
        response = supabase.table('videos').update({
            "gemini_file_uri": myfile.uri,
            "gemini_file_name": myfile.name
        }).eq("video_id", video_id).execute()
        
        print("Successfully updated Supabase record!")
        
        # 6. Cleanup local /tmp/ file
        if os.path.exists(local_input_path):
            os.remove(local_input_path)
            
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"message": "Successfully uploaded to Gemini", "uri": myfile.uri})
        }

    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }