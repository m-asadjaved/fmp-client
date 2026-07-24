import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { youtubeUrl, title, duration } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json({ error: "Missing YouTube URL." }, { status: 400 });
    }

    const videoId = uuidv4();
    const uniqueFilename = `compressed_raw_video/${videoId}.mp4`;
    const uniqueAudioName = `raw_audio/${videoId}.mp3`;
    
    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    // Create DB record
    const { data: dbRecord, error: dbError } = await supabase
      .from("videos")
      .insert([
        {
          user_id: userId,
          file_key: uniqueFilename, // S3 key
          original_name: title || "YouTube Video",
          content_type: "video/mp4",
          file_size: 0, // Unknown until downloaded
          duration: duration || 0,
          video_url: videoUrl,
          thumbnail_url: null, // Could fetch youtube thumbnail, but keeping simple
          credits_used: 0,
          video_id: videoId
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Supabase Error:", dbError);
      throw dbError;
    }

    // Trigger AWS Lambda to process the video
    const lambdaUrl = process.env.AWS_COMPRESSOR_LAMBDA_URL || process.env.AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL;
    
    if (!lambdaUrl) {
      throw new Error("AWS Compressor Lambda URL is not configured.");
    }

    // Base URL for webhooks
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (
      request.headers.get("origin") || `https://${request.headers.get("host")}`
    );

    const payload = {
      req_id: videoId,
      user_id: userId,
      webhook_url: `${appUrl}/api/webhooks/video-processing`, // Ensure this matches actual webhook URL
      s3_bucket: process.env.AWS_BUCKET_NAME,
      s3_output_key: uniqueFilename,
      s3_audio_key: uniqueAudioName,
      youtube_url: youtubeUrl,
      youtube_api_key: process.env.VIDEO_DOWNLOAD_API_KEY
    };

    const lambdaResponse = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!lambdaResponse.ok) {
      const errText = await lambdaResponse.text();
      console.error("Lambda Error:", errText);
      throw new Error("Failed to trigger Lambda: " + lambdaResponse.status);
    }

    return NextResponse.json({ success: true, dbRecord });

  } catch (error) {
    console.error("YouTube Process Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
