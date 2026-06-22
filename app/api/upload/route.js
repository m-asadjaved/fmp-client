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
    
    // Strict Guard: Block logged-out users from seeing history
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: data });
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
    
    // Strict Guard: Block logged-out users from uploading
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { filename, contentType, fileSize, duration } = await request.json();

    // 1. Validation
    if (!contentType.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files are allowed." }, { status: 400 });
    }

    // 2. Enforce Logged-In User Limits (3 files max, 500MB max size)
    const sizeLimit = 500 * 1024 * 1024; // 500MB
    if (fileSize > sizeLimit) {
      return NextResponse.json({ error: "File size exceeds the 500MB limit for users." }, { status: 403 });
    }

    const { count, error: countError } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!countError && count >= 3) {
      return NextResponse.json({ error: "You have reached your maximum limit of 3 video uploads." }, { status: 403 });
    }

    // 3. Generate secure filename using UUID
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // 4. Save metadata record to Supabase
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
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. Build S3 Target upload signature
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return NextResponse.json({ 
      uploadUrl, 
      dbRecord 
    });

  } catch (error) {
    console.error("Pipeline Exception:", error);
    return NextResponse.json({ error: "Internal Pipeline Failure" }, { status: 500 });
  }
}