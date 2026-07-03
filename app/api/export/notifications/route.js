import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET: fetch unacknowledged completed jobs for the notification banner ─────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: jobs, error } = await supabase
      .from("post_jobs")
      .select("id, platform, platforms, scheduled_for, output_url, completed_at, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .eq("acknowledged", false)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error("[GET /api/export/notifications]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH: mark a completed job as acknowledged (dismiss alert) ──────────────
export async function PATCH(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    await supabase
      .from("post_jobs")
      .update({ acknowledged: true })
      .eq("id", jobId)
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/export/notifications]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
