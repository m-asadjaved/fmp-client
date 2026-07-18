import { renderMediaOnLambda } from "@remotion/lambda/client";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      videoUrl, 
      captions, 
      words, 
      overlays, 
      fontSize, 
      verticalPosition, 
      durationInFrames, 
      fps,
      brolls,
      bgMusicSrc,
      bgMusicVolume,
      hook,
      theme,
      splitTemplate,
      splitPosition,
      splitScale,
      splitX,
      splitY,
    } = body;

    const region = process.env.REMOTION_AWS_REGION || "us-east-1";
    const functionName = process.env.REMOTION_FUNCTION_NAME || "remotion-render-4-0-484-mem2048mb-disk2048mb-900sec"; 
    
    // IMPORTANT: You must deploy your Remotion code to an S3 bucket using `npx remotion lambda sites create`
    // and put the resulting serve URL in your .env file
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!serveUrl) {
      return NextResponse.json(
        { error: "REMOTION_SERVE_URL is not set. Please deploy your Remotion project first using `npx remotion lambda sites create`." },
        { status: 500 }
      );
    }

    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "CaptionComposition", // The Composition ID you defined in your Remotion Root
      inputProps: {
        videoUrl,
        captions,
        words,
        overlays,
        fontSize,
        verticalPosition,
        durationInFrames,
        fps,
        brolls,
        bgMusicSrc,
        bgMusicVolume,
        hook,
        theme,
        splitTemplate,
        splitPosition,
        splitScale,
        splitX,
        splitY,
      },
      codec: "h264",
      framesPerLambda: 300,
      privacy: "public", // Makes the output S3 object publicly readable
    });

    return NextResponse.json({ renderId, bucketName });
  } catch (error) {
    console.error("Error exporting video:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
