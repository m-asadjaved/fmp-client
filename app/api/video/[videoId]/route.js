import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Fixed typo from AUS_BUCKET_URL to AWS_BUCKET_URL
const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL || ""; 

// ----------------------------------------------------
// GET: Fetch History & Redirect (Authenticated Only)
// ----------------------------------------------------
// Note: 'request' is the 1st param, 'context' (containing params) is the 2nd param.
export async function GET(request, context) {
  try {
    // Await params correctly for modern Next.js versions
    const params = await context.params;
    const { videoId } = params;

    const { userId } = await auth();
    
    // Strict Guard: Block logged-out users
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Verify ownership of the video in Supabase
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .single(); // Use .single() if you're fetching one specific video ID

    if (error || !data) {
      return NextResponse.json({ error: "Video not found or unauthorized" }, { status: 404 });
    }

    // Fixed the trailing '}' typo at the end of the URL string
    const redirectUrl = `${AWS_BUCKET_URL}/raw_videos/${videoId}.mp4`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Supabase Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// ----------------------------------------------------
// DELETE: Remove Video Record (Authenticated Only)
// ----------------------------------------------------
export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const { videoId } = params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("user_id", userId)
      .eq("video_id", videoId);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supabase Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}