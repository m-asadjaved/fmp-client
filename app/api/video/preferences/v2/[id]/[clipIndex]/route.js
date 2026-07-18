import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request, context) {
  try {
    const params = await context.params;
    const { id, clipIndex } = params;

    if (!id || clipIndex === undefined) {
      return NextResponse.json({ error: "Missing videoId or clipIndex" }, { status: 400 });
    }

    const index = parseInt(clipIndex, 10);

    const { data: clipData, error: fetchError } = await supabase
      .from("generated_clips")
      .select("preferences")
      .eq("video_id", id)
      .eq("clip_index", index)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!clipData) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    return NextResponse.json({ preferences: clipData.preferences || null }, { status: 200 });
  } catch (error) {
    console.error(`[GET /video/preferences/v2/:id/:clipIndex]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const params = await context.params;
    const { id, clipIndex } = params;
    const body = await request.json();

    if (!id || clipIndex === undefined) {
      return NextResponse.json({ error: "Missing videoId or clipIndex" }, { status: 400 });
    }

    const index = parseInt(clipIndex, 10);

    const { data: clipData, error: fetchError } = await supabase
      .from("generated_clips")
      .select("id")
      .eq("video_id", id)
      .eq("clip_index", index)
      .maybeSingle();

    if (fetchError || !clipData) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("generated_clips")
      .update({ preferences: body.preferences })
      .eq("id", clipData.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`[POST /video/preferences/v2/:id/:clipIndex]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
