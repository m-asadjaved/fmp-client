import { renderMediaOnLambda } from "@remotion/lambda/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const PLATFORMS = ["YouTube", "TikTok", "Instagram Reels"];

// ─── POST: Start export job and save to DB, returns immediately ───────────────
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      jobId,
      videoId,
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
      targetPlatforms,
      scheduledFor,
    } = body;

    const region = process.env.REMOTION_AWS_REGION || "us-east-1";
    const functionName =
      process.env.REMOTION_FUNCTION_NAME ||
      "remotion-render-4-0-484-mem2048mb-disk2048mb-900sec";
    const serveUrl = process.env.REMOTION_SERVE_URL;

    if (!serveUrl) {
      return NextResponse.json(
        {
          error:
            "REMOTION_SERVE_URL is not set. Deploy your Remotion project first.",
        },
        { status: 500 }
      );
    }

    // Pick target platforms (passed from client or default)
    const platforms =
      (targetPlatforms && targetPlatforms.length > 0)
        ? targetPlatforms
        : [PLATFORMS[0]];

    // 1. Start Remotion Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "CaptionComposition",
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
      },
      codec: "h264",
      framesPerLambda: 300,
      privacy: "public",
    });

    // 2. Save or update job record to Supabase
    let job = null;
    let dbError = null;

    if (jobId) {
      const { data, error } = await supabase
        .from("post_jobs")
        .update({
          render_id: renderId,
          bucket_name: bucketName,
          region,
          function_name: functionName,
          platforms, // JSONB
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          status: "processing", // Always processing initially for Remotion
          output_url: null,
          video_id: videoId,
        })
        .eq("id", jobId)
        .select()
        .single();
      job = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from("post_jobs")
        .insert({
          user_id: userId,
          render_id: renderId,
          bucket_name: bucketName,
          region,
          function_name: functionName,
          platforms, // JSONB
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          status: "processing", // Always processing initially for Remotion
          output_url: null,
          video_id: videoId,
        })
        .select()
        .single();
      job = data;
      dbError = error;
    }

    if (dbError) {
      console.error("[POST /api/export/post] DB error:", dbError);
      // Non-fatal — render is still running, just won't track it
    }

    return NextResponse.json({
      success: true,
      jobId: job?.id ?? null,
      renderId,
      bucketName,
      platforms,
      scheduledFor,
    });
  } catch (error) {
    console.error("[POST /api/export/post]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

