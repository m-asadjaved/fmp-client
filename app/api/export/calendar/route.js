import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET /api/export/calendar
// Fetches all scheduled posts for the user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: jobs, error } = await supabase
      .from("post_jobs")
      .select("id, platforms, scheduled_for, status, created_at, video_id")
      .eq("user_id", userId)
      .not("scheduled_for", "is", null)
      .order("scheduled_for", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error("[GET /api/export/calendar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE /api/export/calendar
// Deletes a scheduled post
export async function DELETE(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("post_jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // Ensure the user owns the job

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/export/calendar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

