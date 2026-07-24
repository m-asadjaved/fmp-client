import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileKeys } = await request.json();
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const statuses = {};

    await Promise.all(
      fileKeys.map(async (key) => {
        const compressedKey = key.startsWith("compressed_") ? key : `compressed_${key}`;
        try {
          await s3Client.send(
            new HeadObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: compressedKey,
            })
          );
          statuses[key] = "ready";
        } catch (error) {
          statuses[key] = "processing";
        }
      })
    );

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Compression Status Error:", error);
    return NextResponse.json({ error: "Failed to check statuses" }, { status: 500 });
  }
}
