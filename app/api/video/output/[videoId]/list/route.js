import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL || "";

// Maximum number of clips we'll probe for
const MAX_CLIPS = 10;

/**
 * GET /api/video/output/[videoId]/list
 * Returns an array of available clip URLs for a given videoId by probing S3.
 */
export async function GET(request, context) {
  try {
    const params = await context.params;
    const { videoId } = params;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Verify ownership
    const { data, error } = await supabase
      .from("videos")
      .select("video_id")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Video not found or unauthorized" }, { status: 404 });
    }

    // Query the pre-computed generated clips from the database
    const { data: generatedClips, error: clipsError } = await supabase
      .from('generated_clips')
      .select('id, clip_index, clip_url, created_at')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    let availableClips = [];

    if (!clipsError && generatedClips && generatedClips.length > 0) {
      availableClips = generatedClips.map(clip => ({
        id: clip.id,
        index: clip.clip_index,
        url: clip.clip_url,
        createdAt: clip.created_at
      }));
    } else {
      // Fallback for older videos that don't have records in generated_clips
      const legacyUrl = `${AWS_BUCKET_URL}/processed_videos/output-${videoId}.mp4`;
      try {
        const res = await fetch(legacyUrl, { method: "HEAD" });
        if (res.ok) {
          availableClips.push({ index: 0, url: legacyUrl });
        }
      } catch {
        // nothing
      }
    }

    return NextResponse.json({ clips: availableClips });
  } catch (err) {
    console.error("Clip list error:", err);
    return NextResponse.json({ error: "Failed to list clips" }, { status: 500 });
  }
}
