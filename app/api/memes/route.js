import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET() {
  try {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    
    // We want to list all objects with the prefix 'hooks/memes/'
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "hooks/memes/",
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return NextResponse.json({ memes: [] });
    }

    // Filter out the directory itself if it is returned, and format the results
    const memes = response.Contents
      .filter((item) => item.Key !== "hooks/memes/" && !item.Key.endsWith("/"))
      .map((item, index) => {
        // Extract a clean name from the filename
        const filename = item.Key.split('/').pop() || "";
        const name = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const formattedName = name.replace(/\b\w/g, l => l.toUpperCase());

        return {
          id: `meme-${index}`,
          name: formattedName || "Meme Video",
          url: `https://${bucketName}.s3.${region}.amazonaws.com/${item.Key}`,
        };
      });

    return NextResponse.json({ memes });
  } catch (error) {
    console.error("Error fetching memes from S3:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
