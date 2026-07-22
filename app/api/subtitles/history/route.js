import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

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

    // 1. Fetch user's videos
    const { data: userVideos, error: videosError } = await supabase
      .from("videos")
      .select("video_id, original_name, duration, thumbnail_url")
      .eq("user_id", userId);

    if (videosError) {
      console.error("Database query error (videos):", videosError);
      return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }

    if (!userVideos || userVideos.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const videoIds = userVideos.map(v => v.video_id);

    // 2. Fetch processing records for those videos
    const { data: processingRecords, error: processingError } = await supabase
      .from("video_processing_req")
      .select("id, video_id, status, created_at, ai_analysis")
      .in("video_id", videoIds)
      .eq("status", "completed")
      .not("ai_analysis", "is", null)
      .order("created_at", { ascending: false });

    if (processingError) {
      console.error("Database query error (processing):", processingError);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    // Map to a cleaner format for the frontend
    const history = processingRecords
      // Filter strictly for subtitle transcripts
      .filter(record => record.ai_analysis && record.ai_analysis.type === "subtitles")
      .map(record => {
        const video = userVideos.find(v => v.video_id === record.video_id);
        return {
          id: record.id,
          videoId: record.video_id,
          status: record.status,
          createdAt: record.created_at,
          name: video?.original_name || "Untitled Subtitle Project",
          duration: video?.duration || 0,
          thumbnailUrl: video?.thumbnail_url
        };
      });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Fetch Subtitles History Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
