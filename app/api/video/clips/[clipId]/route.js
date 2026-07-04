import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const { clipId } = params;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!clipId) {
      return NextResponse.json({ error: "Missing clipId" }, { status: 400 });
    }

    // Get the clip details first to verify ownership and get S3 URL
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select('id, user_id, clip_url')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    if (clip.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Try to delete from S3
    if (clip.clip_url && process.env.AWS_BUCKET_NAME) {
      try {
        const urlObj = new URL(clip.clip_url);
        // The pathname includes the leading slash, e.g. /processed_videos/output-123-0.mp4
        const key = urlObj.pathname.substring(1); 
        
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
      } catch (s3Err) {
        console.error("Failed to delete from S3:", s3Err);
        // We continue anyway so we can delete the database record
      }
    }

    // Delete from Supabase (by clip_url to remove any duplicates from webhook retries)
    const { error: deleteError } = await supabase
      .from('generated_clips')
      .delete()
      .eq('clip_url', clip.clip_url);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete clip error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
