import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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

    // Fetch existing user record
    const { data: user } = await supabase
      .from("user_credits")
      .select("balance, plan, plan_credits")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ history: data, credits: user.balance });
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

    // 3. Calculate Credit Cost
    const credits_cost = Number((duration / 1200).toFixed(4));

    // 4. Deduct Credits First (Fails early if user has insufficient credits)
    try {
      const { data: deductionData, error: deductionError } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: credits_cost,
        p_description: `Uploaded video: ${filename} (${duration}s)`
      });

      if (deductionError) throw new Error(deductionError.message);
    } catch (err) {
      return NextResponse.json({ error: `Credit deduction failed: ${err.message}` }, { status: 400 });
    }

    // 5. Generate secure filename using UUID
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `raw_videos/${uuidv4()}.${fileExtension}`;

    // 6. Construct Public Storage URL Address destination path
    const videoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFilename}`;

    // 7. Save metadata record + constructed direct URL to Supabase
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
        credits_used: credits_cost // Save the calculated cost
      },
    ])
    .select()
    .single();

    if (dbError) throw dbError;

    // 8. Build S3 Target upload signature
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    try {
      // Call the PostgreSQL RPC we made in Step 2
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: credits_cost,
        p_description: 'Generation of Premium Asset'
      });
  
      if (error) throw new Error(error.message);
  
      // --- EXECUTE THE ACTUAL PAID APP LOGIC HERE ---
      // (e.g., Call OpenAI, midjourney, render video, etc.)
  
      return NextResponse.json({ 
        uploadUrl, 
        dbRecord 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }

  } catch (error) {
    console.error("Pipeline Exception:", error);
    return NextResponse.json({ error: "Internal Pipeline Failure" }, { status: 500 });
  }
}