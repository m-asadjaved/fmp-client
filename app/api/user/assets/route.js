import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = [];

    // 1. Fetch raw videos from DB
    const { data: videos, error: dbError } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!dbError && videos) {
      videos.forEach((v) => {
        assets.push({
          id: v.id,
          type: "Raw Video",
          name: v.original_name || "Untitled",
          size: Number(v.file_size) || 0,
          date: v.created_at,
          url: v.video_url,
          thumbnail: v.thumbnail_url,
          s3Key: v.file_key, // Needed for deletion
          isDbRecord: true,
        });
      });
    }

    // 2. Fetch S3 assets (broll, hooks, bg_music)
    const prefixes = [
      { prefix: `user_uploads/broll/${userId}/`, label: "B-Roll" },
      { prefix: `user_uploads/hooks/${userId}/`, label: "Hook" },
      { prefix: `user_uploads/bg_music/${userId}/`, label: "Music" },
    ];

    for (const p of prefixes) {
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: process.env.AWS_BUCKET_NAME,
          Prefix: p.prefix,
          ContinuationToken: continuationToken,
        });

        try {
          const response = await s3Client.send(command);
          if (response.Contents) {
            for (const item of response.Contents) {
              // Don't list the "folder" itself if it exists
              if (item.Key === p.prefix) continue;

              const name = item.Key.split("/").pop() || "Unknown File";
              assets.push({
                id: item.Key, // Use key as ID for S3-only assets
                type: p.label,
                name: name,
                size: item.Size || 0,
                date: item.LastModified,
                url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
                s3Key: item.Key,
                isDbRecord: false,
              });
            }
          }
          isTruncated = response.IsTruncated;
          continuationToken = response.NextContinuationToken;
        } catch (err) {
          console.error(`Error fetching S3 objects for prefix ${p.prefix}:`, err);
          break;
        }
      }
    }

    // Sort all assets by date descending
    assets.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("[GET /api/user/assets]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isDbRecord, s3Key, thumbnail } = await request.json();

    if (!s3Key) {
      return NextResponse.json({ error: "Missing s3Key" }, { status: 400 });
    }

    // 1. Delete from S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      })
    );

    // Delete thumbnail from S3 if it exists
    if (thumbnail) {
      try {
        const thumbUrlObj = new URL(thumbnail);
        const thumbKey = decodeURIComponent(thumbUrlObj.pathname.substring(1)); // strip leading slash
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: thumbKey,
          })
        );
      } catch (err) {
        console.error("Failed to delete thumbnail from S3:", err);
      }
    }

    // 2. Delete from DB if applicable
    if (isDbRecord) {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId); // Security: ensure it belongs to the user

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/user/assets]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
