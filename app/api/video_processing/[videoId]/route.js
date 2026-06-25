import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL = process.env.AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const WEBHOOK_URL_VIDEO_STATUS = process.env.WEBHOOK_URL_VIDEO_STATUS;

export async function GET(request, context) {
  try {
    // Await params correctly for modern Next.js versions
    const params = await context.params;
    const { videoId } = params;

    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Send the POST request to the external/specific URL
    const response = await fetch(AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        req_id: videoId,
        user_id: userId,
        s3_bucket: AWS_BUCKET_NAME,
        s3_input_key: `raw_videos/${videoId}.mp4`,
        s3_output_key: `processed_videos/output-${videoId}.mp4`,
        webhook_url: WEBHOOK_URL_VIDEO_STATUS,
        clip_info: {"start_time": "00:00:00", "duration_seconds": "15"},
        full_subtitles: "[00:00:05] Testing our newly minted containerized webhook execution.",
      }),
    });

    // 3. Handle errors from the target server
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    // 4. Parse the external server's response
    const data = await response.json();

    // 5. Return the data back to your client
    return NextResponse.json({ success: true, data });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
