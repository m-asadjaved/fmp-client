import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { v4 as uuidv4 } from "uuid";

// Set max execution time to 5 minutes to allow for large downloads
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

    const { downloadUrl, videoTitle, duration, thumbnailUrl } = await request.json();
    if (!downloadUrl) {
      return NextResponse.json({ error: "Missing download URL." }, { status: 400 });
    }

    const videoId = uuidv4();
    const uniqueFilename = `raw_videos/${videoId}.mp4`;
    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    let thumbnailS3Url = null;
    let uniqueThumbnailName = null;
    if (thumbnailUrl) {
      uniqueThumbnailName = `thumbnail/${videoId}.jpg`;
      thumbnailS3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueThumbnailName}`;
    }

    // 1. Create DB Record first (optimistic insertion)
    const { data: dbRecord, error: dbError } = await supabase
      .from("videos")
      .insert([
        {
          user_id: userId,
          file_key: uniqueFilename,
          original_name: videoTitle ? `${videoTitle}.mp4` : `youtube_${videoId}.mp4`,
          content_type: "video/mp4",
          file_size: 0, // We will update this later if possible, or just leave it at 0
          duration: duration || 0,
          video_url: videoUrl,
          thumbnail_url: thumbnailS3Url, // S3 Thumbnail URL
          credits_used: 0, 
          video_id: videoId 
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Fetch the video stream from the API
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      throw new Error("Failed to fetch stream from download URL");
    }

    const uploads = [];

    // 3. Upload stream directly to S3
    uploads.push(
      new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: uniqueFilename,
          Body: response.body, // Native Web Stream
          ContentType: "video/mp4",
        },
      }).done()
    );

    // 4. Fetch and upload Thumbnail to S3 if available
    if (thumbnailUrl && uniqueThumbnailName) {
      const thumbResponse = await fetch(thumbnailUrl);
      if (thumbResponse.ok && thumbResponse.body) {
        uploads.push(
          new Upload({
            client: s3Client,
            params: {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: uniqueThumbnailName,
              Body: thumbResponse.body,
              ContentType: "image/jpeg",
            },
          }).done()
        );
      }
    }

    // Await all uploads completion
    await Promise.all(uploads);

    // Optionally: Update the file size in DB if available from Content-Length header
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      await supabase
        .from("videos")
        .update({ file_size: parseInt(contentLength, 10) })
        .eq("id", dbRecord.id);
    }

    return NextResponse.json({ 
      success: true,
      dbRecord: { ...dbRecord, file_size: contentLength ? parseInt(contentLength, 10) : 0 }
    });

  } catch (error) {
    console.error("YouTube Transfer Error:", error);
    return NextResponse.json({ error: "Internal Server Error during transfer" }, { status: 500 });
  }
}
