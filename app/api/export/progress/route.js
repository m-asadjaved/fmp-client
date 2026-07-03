import { getRenderProgress, presignUrl } from "@remotion/lambda/client";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const renderId = searchParams.get("renderId");
  const bucketName = searchParams.get("bucketName");

  if (!renderId || !bucketName) {
    return NextResponse.json({ error: "Missing renderId or bucketName" }, { status: 400 });
  }

  try {
    const region = process.env.REMOTION_AWS_REGION || "us-east-1";
    const functionName = process.env.REMOTION_FUNCTION_NAME || "remotion-render-4-0-484-mem2048mb-disk2048mb-900sec";

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
    });

    // If the render is complete, generate a presigned URL to bypass any S3 public access blocks
    if (progress.done) {
      const presigned = await presignUrl({
        region,
        bucketName,
        objectKey: `renders/${renderId}/out.mp4`,
        expiresInSeconds: 3600,
      });
      progress.outUrl = presigned;
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error getting progress:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
