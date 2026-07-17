import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION;

    // Hardcoded global templates
    const defaultTemplates = [
      { id: "none", name: "No Split Screen", url: null, emoji: "📱" },
      { id: "minecraft", name: "Minecraft Parkour", url: `https://${bucketName}.s3.${region}.amazonaws.com/templates/minecraft.mp4`, emoji: "🧱" },
      { id: "gta", name: "GTA V Gameplay", url: `https://${bucketName}.s3.${region}.amazonaws.com/templates/gta.mp4`, emoji: "🚗" },
      { id: "slime", name: "ASMR Slime", url: `https://${bucketName}.s3.${region}.amazonaws.com/templates/slime.mp4`, emoji: "🧪" }
    ];

    let userSplits = [];

    // Fetch user's custom uploaded splits
    const prefix = `user_uploads/splits/${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      userSplits = response.Contents
        .filter((item) => item.Key !== prefix && !item.Key.endsWith("/"))
        .map((item, index) => {
          return {
            id: `custom-split-${index}`,
            name: `Custom Video ${index + 1}`,
            url: `https://${bucketName}.s3.${region}.amazonaws.com/${item.Key}`,
            emoji: "🎥"
          };
        });
    }

    const templates = [...defaultTemplates, ...userSplits];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching split templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
