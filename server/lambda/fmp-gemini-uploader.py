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
# You must set GEMINI_API_KEY in Lambda Environment Variables
ai = genai.Client()

# Initialize Supabase Client
# You must set SUPABASE_URL and SUPABASE_SERVICE_KEY in Lambda Env Vars
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def lambda_handler(event, context):
    try:
        # 1. Parse the S3 Event
        record = event['Records'][0]
        bucket_name = record['s3']['bucket']['name']
        object_key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        
        # Ensure it's in the raw_videos directory
        if not object_key.startswith('raw_videos/'):
            print("Ignoring file not in raw_videos/ directory.")
            return {"statusCode": 200, "body": "Ignored"}
            
        print(f"Triggered for file: {object_key} in bucket: {bucket_name}")
        
        # Extract the video ID from the filename (e.g., raw_videos/123-abc.mp4 -> 123-abc)
        video_id = object_key.split('/')[-1].split('.')[0]
        
        # 2. Download the video from S3 to Lambda's /tmp/ directory
        local_file_path = f"/tmp/{video_id}.mp4"
        print("Downloading from S3...")
        s3_client.download_file(bucket_name, object_key, local_file_path)
        
        # 3. Upload the file to Google Gemini File API
        print("Uploading to Google Gemini File API...")
        myfile = ai.files.upload(file=local_file_path, config={'mime_type': 'video/mp4'})
        
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
        # Assuming you have a 'videos' table with a 'gemini_file_uri' column
        response = supabase.table('videos').update({
            "gemini_file_uri": myfile.uri,
            "gemini_file_name": myfile.name
        }).eq("video_id", video_id).execute()
        
        print("Successfully updated Supabase record!")
        
        # 6. Cleanup local /tmp/ file
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
            
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Successfully uploaded to Gemini", "uri": myfile.uri})
        }

    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
