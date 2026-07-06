import json
import boto3
import os

ecs_client = boto3.client('ecs')
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    try:
        # 1. Parse the incoming body from your API call
        body = json.loads(event.get("body", "{}"))
        
        # 2. Extract the video processing parameters
        req_id = body.get("req_id")
        user_id = body.get("user_id")
        webhook_url = body.get("webhook_url")
        bucket = body.get("s3_bucket")
        input_key = body.get("s3_input_key")
        output_key = body.get("s3_output_key")
        audio_output_key = body.get("s3_audio_output_key")
        clip_info = body.get("clip_info", {})
        subtitles = body.get("full_subtitles", "")
        
        # 3. Create the payload string your script expects
        payload = {
            "req_id": req_id,
            "user_id": user_id,
            "webhook_url": webhook_url,
            "s3_bucket": bucket,
            "s3_input_key": input_key,
            "s3_output_key": output_key,
            "s3_audio_output_key": audio_output_key,
            "clip_info": clip_info,
            "full_subtitles": subtitles
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
        response = ecs_client.run_task(
            cluster='fmpCluster', # Your ECS cluster name
            launchType='FARGATE',
            taskDefinition='fmp-video-processor-task', # Your Task definition name
            count=1,
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
                        'name': 'video-worker', # Must match the container name in Step 1
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
        
        task_arn = response['tasks'][0]['taskArn']
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Your video processing started successfully!", "task_arn": task_arn})
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }