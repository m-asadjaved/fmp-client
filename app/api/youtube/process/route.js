import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const maxDuration = 60;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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

    const { youtubeUrl, title, duration, thumbnailUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json({ error: "Missing YouTube URL." }, { status: 400 });
    }

    const videoId = uuidv4();
    const uniqueFilename = `compressed_raw_videos/${videoId}.mp4`;
    const uniqueAudioName = `raw_audio/${videoId}.mp3`;
    
    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    let thumbnailS3Url = null;
    let uniqueThumbnailName = null;
    
    // 1. Upload thumbnail to S3 (since it's lightweight, we can do it in Next.js)
    if (thumbnailUrl) {
      uniqueThumbnailName = `thumbnail/${videoId}.jpg`;
      thumbnailS3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueThumbnailName}`;
      
      try {
        const thumbResponse = await fetch(thumbnailUrl);
        if (thumbResponse.ok && thumbResponse.body) {
          await new Upload({
            client: s3Client,
            params: {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: uniqueThumbnailName,
              Body: thumbResponse.body,
              ContentType: "image/jpeg",
            },
          }).done();
        }
      } catch (err) {
        console.error("Failed to upload thumbnail to S3:", err);
      }
    }

    // 2. Create DB record
    const { data: dbRecord, error: dbError } = await supabase
      .from("videos")
      .insert([
        {
          user_id: userId,
          file_key: uniqueFilename, // S3 key of the final compressed raw video
          original_name: title ? `${title}.mp4` : `youtube_${videoId}.mp4`,
          content_type: "video/mp4",
          file_size: 0, 
          duration: duration || 0,
          video_url: videoUrl,
          thumbnail_url: thumbnailS3Url, 
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

    // 3. Trigger AWS Lambda to process the video
    const lambdaUrl = process.env.AWS_COMPRESSOR_LAMBDA_URL;
    
    if (!lambdaUrl) {
      throw new Error("AWS Compressor Lambda URL is not configured in .env.");
    }

    const payload = {
      req_id: videoId,
      youtube_url: youtubeUrl,
      video_download_api_key: process.env.VIDEO_DOWNLOAD_API_KEY,
      s3_bucket: process.env.AWS_BUCKET_NAME,
      s3_output_key: uniqueFilename,
      s3_audio_key: uniqueAudioName,
      webhook_url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/api/webhook/youtube`,
    };

    const lambdaRes = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!lambdaRes.ok) {
      const errText = await lambdaRes.text();
      console.error("Lambda Invocation Failed:", errText);
      throw new Error("Failed to start Fargate download task.");
    }

    return NextResponse.json({ success: true, dbRecord });

  } catch (error) {
    console.error("YouTube Process API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
