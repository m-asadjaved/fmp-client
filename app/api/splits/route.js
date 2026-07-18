import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

    // Hardcoded global templates using keys
    const defaultTemplatesRaw = [
      { id: "none", name: "No Split Screen", key: null, emoji: "📱", category: "None" },
      { id: "minecraft", name: "Minecraft Parkour", key: "templates/minecraft.mp4", emoji: "🧱", category: "Gaming" },
      { id: "gta", name: "GTA V Gameplay", key: "templates/gta.mp4", emoji: "🚗", category: "Gaming" },
      { id: "rocket_league-1", name: "Rocket League Gameplay", key: "templates/rocket_league-1.mp4", emoji: "🚗", category: "Gaming" },
      { id: "slime", name: "ASMR Slime", key: "templates/slime.mp4", emoji: "🧪", category: "ASMR" }
    ];

    let userSplitsRaw = [];

    // Fetch user's custom uploaded splits
    const prefix = `user_uploads/splits/${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      // Sort by last modified descending
      const sortedContents = response.Contents.sort((a, b) => b.LastModified - a.LastModified);
      userSplitsRaw = sortedContents
        .filter((item) => item.Key !== prefix && !item.Key.endsWith("/"))
        .map((item, index) => {
          return {
            id: `custom-split-${index}`,
            name: `Custom Video ${index + 1}`,
            key: item.Key,
            emoji: "🎥"
          };
        });
    }

    // Generate presigned URLs for all
    const processTemplates = async (templatesRaw) => {
      return await Promise.all(templatesRaw.map(async (tmpl) => {
        if (!tmpl.key) {
          return { ...tmpl, url: null };
        }
        try {
          const getCmd = new GetObjectCommand({
            Bucket: bucketName,
            Key: tmpl.key
          });
          const url = await getSignedUrl(s3Client, getCmd, { expiresIn: 604800 }); // 7 days expiration
          return { ...tmpl, url };
        } catch (e) {
          console.error("Error generating presigned url for", tmpl.key, e);
          return { ...tmpl, url: null };
        }
      }));
    };

    const defaultTemplates = await processTemplates(defaultTemplatesRaw);
    const userSplits = await processTemplates(userSplitsRaw);

    return NextResponse.json({ defaultTemplates, userSplits });
  } catch (error) {
    console.error("Error fetching split templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    // Verify ownership: key must start with user's split prefix
    const allowedPrefix = `user_uploads/splits/${userId}/`;
    if (!key.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: "Unauthorized to delete this file" }, { status: 403 });
    }

    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCmd);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting split template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
