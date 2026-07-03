import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

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

// Helper function to sum sizes of objects in S3 by prefix
async function getS3PrefixSize(prefix) {
  let totalSize = 0;
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    try {
      const response = await s3Client.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          totalSize += item.Size || 0;
        }
      }
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    } catch (err) {
      console.error(`Error fetching S3 objects for prefix ${prefix}:`, err);
      break; // Stop on error, returning what we have so far
    }
  }

  return totalSize;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get raw videos storage from Supabase
    // Raw videos are tracked in the 'videos' table with file_size in bytes
    const { data: videos, error: dbError } = await supabase
      .from("videos")
      .select("file_size")
      .eq("user_id", userId);

    if (dbError) throw dbError;

    const rawVideosSize = videos.reduce((acc, video) => {
      // Ensure file_size is treated as a number
      const size = Number(video.file_size) || 0;
      return acc + size;
    }, 0);

    // 2. Get asset storage directly from S3
    const prefixes = [
      `user_uploads/broll/${userId}/`,
      `user_uploads/hooks/${userId}/`,
      `user_uploads/bg_music/${userId}/`
    ];

    let assetsSize = 0;
    for (const prefix of prefixes) {
      assetsSize += await getS3PrefixSize(prefix);
    }

    const totalSizeBytes = rawVideosSize + assetsSize;

    return NextResponse.json({
      rawVideosSize,
      assetsSize,
      totalSizeBytes,
      // Provide a pre-formatted string for convenience
      totalSizeGB: (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)
    });
  } catch (error) {
    console.error("[GET /api/user/storage]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
