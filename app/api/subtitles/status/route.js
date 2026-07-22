import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("video_processing_req")
    .select("status")
    .eq("video_id", videoId)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: "pending" }); // Default to pending if not found yet
  }

  return NextResponse.json({ status: data.status });
}
