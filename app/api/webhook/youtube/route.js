import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("📥 Received Fargate Webhook:", body);

    const { req_id, status, video_url, error } = body;

    if (!req_id) {
      return NextResponse.json({ error: "Missing req_id" }, { status: 400 });
    }

    if (status === "completed") {
      console.log(`✅ Video ${req_id} completed. URL: ${video_url}`);
      // NOTE: The videos table doesn't have a "status" column.
      // The UI uses S3 polling to detect completion.
      // If you add a status column to the 'videos' table, you can uncomment this:
      /*
      await supabase
        .from("videos")
        .update({ status: "ready" })
        .eq("video_id", req_id);
      */
    } else if (status === "failed") {
      console.error(`❌ Video ${req_id} failed:`, error);
      // Optional: Update DB to reflect the error state so the user knows
      /*
      await supabase
        .from("videos")
        .update({ status: "failed", error_message: error })
        .eq("video_id", req_id);
      */
    } else if (status === "processing") {
      console.log(`⏳ Video ${req_id} is now processing in Fargate...`);
    }

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
