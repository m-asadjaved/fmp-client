import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

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

// ----------------------------------------------------
// GET: Fetch History (Authenticated Only)
// ----------------------------------------------------
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: user } = await supabase
      .from("user_credits")
      .select("balance, plan, plan_credits")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ history: data, credits: user?.balance || 0 });
  } catch (error) {
    console.error("Supabase Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// ----------------------------------------------------
// POST: Process S3 URL + DB Entry (Authenticated Only)
// ----------------------------------------------------
export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { filename, contentType, fileSize, duration, hasThumbnail } = await request.json();

    if (!contentType.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files are allowed." }, { status: 400 });
    }

    const sizeLimit = 3000 * 1024 * 1024; 
    if (fileSize > sizeLimit) {
      return NextResponse.json({ error: "File size exceeds the 3GB limit for users." }, { status: 403 });
    }

    // 1. Calculate Credit Cost
    const credits_cost = Number((duration / 1200).toFixed(4));

    // 2. Deduct Credits (Fails early if user has insufficient credits)
    try {
      const { error: deductionError } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: credits_cost,
        p_description: `Uploaded video: ${filename} (${duration}s)`
      });

      if (deductionError) throw new Error(deductionError.message);
    } catch (err) {
      return NextResponse.json({ error: `Credit deduction failed: ${err.message}` }, { status: 400 });
    }

    const videoId = uuidv4();
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `raw_videos/${videoId}.${fileExtension}`;
    const uniqueThumbnailName = `thumbnail/${videoId}.jpg`;

    // 3. Construct Public URLs
    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;
    const thumbnailUrl = hasThumbnail 
      ? `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueThumbnailName}` 
      : null;

    // 4. Save metadata record to Supabase (includes thumbnail_url link column)
    const { data: dbRecord, error: dbError } = await supabase
      .from("videos")
      .insert([
        {
          user_id: userId,
          file_key: uniqueFilename,
          original_name: filename,
          content_type: contentType,
          file_size: fileSize,
          duration: duration,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl, // Added tracking target path reference here
          credits_used: credits_cost, 
          video_id: videoId 
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. Generate secure signature upload command for the main video asset
    const videoCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3Client, videoCommand, { expiresIn: 60 });

    // 6. Conditionally generate signature upload command for the extracted frame image
    let thumbnailUploadUrl = null;
    if (hasThumbnail) {
      const thumbnailCommand = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: uniqueThumbnailName,
        ContentType: "image/jpeg",
      });
      thumbnailUploadUrl = await getSignedUrl(s3Client, thumbnailCommand, { expiresIn: 60 });
    }

    return NextResponse.json({ 
      uploadUrl, 
      thumbnailUploadUrl, 
      dbRecord 
    });

  } catch (error) {
    console.error("Pipeline Exception:", error);
    return NextResponse.json({ error: "Internal Pipeline Failure" }, { status: 500 });
  }
}