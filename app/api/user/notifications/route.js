import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET: fetch recent notifications for the user ─────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We can use post_jobs to derive notifications
    // E.g., A completed job = "Video posted successfully"
    // A failed job = "Video failed to post"
    // A processing job with scheduled_for = "Video is scheduled"
    
    const { data: jobs, error } = await supabase
      .from("post_jobs")
      .select("id, platform, platforms, scheduled_for, status, created_at, completed_at, acknowledged")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20); // Get latest 20 notifications

    if (error) throw error;

    // Map jobs to standardized notification objects
    const notifications = jobs.map(job => {
      let title = "";
      let message = "";
      let type = "info"; // info, success, warning, error
      const isScheduled = !!job.scheduled_for;
      const targetPlatforms = Array.isArray(job.platforms) ? job.platforms : (job.platform ? [job.platform] : []);
      const platformStr = targetPlatforms.join(", ");

      if (job.status === "completed") {
        title = "Post Successful";
        message = `Your video was successfully posted to ${platformStr}.`;
        type = "success";
      } else if (job.status === "failed") {
        title = "Post Failed";
        message = `There was an error posting to ${platformStr}.`;
        type = "error";
      } else if (job.status === "processing") {
        if (isScheduled) {
          title = "Video Scheduled";
          message = `Your video is scheduled to be posted to ${platformStr} on ${new Date(job.scheduled_for).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}.`;
          type = "info";
        } else {
          title = "Processing Post";
          message = `Your video is currently being rendered and posted to ${platformStr}...`;
          type = "warning";
        }
      }

      return {
        id: job.id,
        title,
        message,
        type,
        timestamp: job.completed_at || job.created_at,
        acknowledged: job.acknowledged,
        jobId: job.id
      };
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[GET /api/user/notifications]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH: Mark a specific notification or all notifications as read ─────────
export async function PATCH(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await supabase
        .from("post_jobs")
        .update({ acknowledged: true })
        .eq("user_id", userId)
        .eq("acknowledged", false);
    } else if (notificationId) {
      await supabase
        .from("post_jobs")
        .update({ acknowledged: true })
        .eq("id", notificationId)
        .eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/user/notifications]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
