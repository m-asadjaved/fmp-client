import json
import boto3
import os
import urllib.parse

ecs_client = boto3.client('ecs')
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    # Base headers for CORS support if called directly from a browser/frontend
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }
    
    try:
        # Handle CORS Preflight
        if event.get("httpMethod") == "OPTIONS":
            return {"statusCode": 200, "headers": headers, "body": ""}

        # 1. Parse Event (Handle both API Gateway and S3 Triggers)
        if 'Records' in event and 's3' in event['Records'][0]:
            # --- TRIGGERED AUTOMATICALLY BY S3 ---
            record = event['Records'][0]
            bucket = record['s3']['bucket']['name']
            input_key = urllib.parse.unquote_plus(record['s3']['object']['key'])
            
            # Ignore files that aren't in raw_videos/
            if not input_key.startswith('raw_videos/'):
                print("Ignoring file outside raw_videos/ directory.")
                return {"statusCode": 200, "body": "Ignored"}

            filename = input_key.split('/')[-1]
            req_id = filename.split('.')[0]
            user_id = "s3-auto-trigger"
            webhook_url = "" # Can't know Next.js webhook URL from pure S3 trigger
            output_key = f"compressed_{input_key}"
            audio_key = f"raw_audio/{req_id}.mp3"
            
            # Apply our ultra-fast 480p default for Gemini analysis
            ffmpeg_commands = [
                "-c:v", "libx264", 
                "-crf", "32", 
                "-preset", "ultrafast", 
                "-vf", "scale=-2:480",    
                "-r", "15",               
                "-c:a", "aac", 
                "-b:a", "64k" 
            ]
            youtube_url = None
            video_download_api_key = None
        else:
            # --- TRIGGERED MANUALLY BY API GATEWAY ---
            body = event.get("body", "{}")
            if isinstance(body, str):
                body = json.loads(body)
            
            req_id = body.get("req_id", "default_req")
            user_id = body.get("user_id")
            webhook_url = body.get("webhook_url")
            bucket = body.get("s3_bucket")
            input_key = body.get("s3_input_key")
            output_key = body.get("s3_output_key")
            audio_key = body.get("s3_audio_key", f"raw_audio/{req_id}.mp3")
            ffmpeg_commands = body.get("ffmpeg_commands", [])
            youtube_url = body.get("youtube_url")
            video_download_api_key = body.get("video_download_api_key")

        # 2. Validate extracted variables
        if not bucket or (not input_key and not youtube_url) or not output_key:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Missing required fields: s3_bucket, (s3_input_key or youtube_url), and s3_output_key are required."})
            }
        
        # 3. Create the payload string your Fargate script expects
        payload = {
            "req_id": req_id,
            "user_id": user_id,
            "webhook_url": webhook_url,
            "s3_bucket": bucket,
            "s3_input_key": input_key,
            "s3_output_key": output_key,
            "s3_audio_key": audio_key,
            "ffmpeg_commands": ffmpeg_commands,
            "youtube_url": youtube_url,
            "video_download_api_key": video_download_api_key
        }
        
        # Save payload to S3 to bypass 8KB environment variable limit
        payload_key = f"temp_payloads/{req_id}_payload_{output_key.replace('/', '_')}.json"
        
        s3_client.put_object(
            Bucket=bucket,
            Key=payload_key,
            Body=json.dumps(payload),
            ContentType="application/json"
        )
        
        # 4. Trigger the Fargate Task
        # IMPORTANT: Make sure to replace cluster, taskDefinition, subnets, and securityGroups with your actual AWS values
        response = ecs_client.run_task(
            cluster=os.environ.get('ECS_CLUSTER_NAME', 'fmpCluster'),
            # launchType='FARGATE',
            taskDefinition=os.environ.get('ECS_TASK_DEFINITION', 'fmp-video-compressor-task'), 
            count=1,
            capacityProviderStrategy=[
                {
                    'capacityProvider': 'FARGATE_SPOT',
                    'weight': 1
                }
            ],
            networkConfiguration={
                'awsvpcConfiguration': {
                    # Replace with your default AWS VPC Subnets and Security Group
                    'subnets': ['subnet-0f29df04595ce467f', 'subnet-0fdb3d8b12487e125'], 
                    'securityGroups': ['sg-098002ff54b70d66d'],
                    'assignPublicIp': 'ENABLED' # Required to pull ECR image
                }
            },
            overrides={
                'containerOverrides': [
                    {
                        'name': 'video-compressor', # Must match the container name in your Task Definition
                        'environment': [
                            {
                                'name': 'PAYLOAD_S3_KEY',
                                'value': payload_key
                            },
                            {
                                'name': 'PAYLOAD_S3_BUCKET',
                                'value': bucket
                            }
                        ]
                    }
                ]
            }
        )
        
        # Extract task ARN for logging/tracking
        task_arn = response['tasks'][0]['taskArn'] if response.get('tasks') else "Unknown ARN"
        
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "message": "Fargate video compression task started successfully!", 
                "task_arn": task_arn
            })
        }
        
    except Exception as e:
        print(f"Lambda Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }