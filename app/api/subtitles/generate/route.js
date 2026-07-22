import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    // 1. Fetch Video Metadata
    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("duration, credits_used, original_name, video_url")
      .eq("video_id", videoId)
      .single();

    if (videoError || !videoData) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const durationSeconds = Number(videoData.duration) || 0;
    const creditsCost = Math.max(1, Math.ceil(durationSeconds / 60)); // 1 credit per minute

    // 2. Check User Credits
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (creditsError || !userCredits) {
      return NextResponse.json({ error: "Could not retrieve user credits" }, { status: 500 });
    }

    if (userCredits.balance < creditsCost) {
      return NextResponse.json(
        { error: `Insufficient credits. Requires ${creditsCost} credits, but you only have ${userCredits.balance}.` },
        { status: 402 }
      );
    }

    // 3. Deduct Credits
    const newBalance = userCredits.balance - creditsCost;
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) throw new Error("Failed to deduct credits");

    // Log the transaction
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -creditsCost,
      description: `Generated subtitles for video: ${videoData.original_name || videoId}`,
    });

    await supabase.from("videos").update({ credits_used: (videoData.credits_used || 0) + creditsCost }).eq("video_id", videoId);

    // 4. Fetch the video from S3 and send directly to ElevenLabs
    const fileResponse = await fetch(videoData.video_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch video from S3: ${fileResponse.statusText}`);
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    const videoBlob = new Blob([fileBuffer], { type: "video/mp4" });

    const data = await elevenlabs.speechToText.convert({
      file: videoBlob,
      modelId: "scribe_v2",
      timestampsGranularity: "word"
    });

    const words = data.words
      .filter(w => w.type === "word")
      .map(w => ({ text: w.text, start: w.start, end: w.end }));

    const subtitlesText = wordsToSubtitleString(data.words);

    // 5. Save the final transcript into generated_clips so the Editor can consume it
    const { error: insertError } = await supabase.from('generated_clips').insert([{
      user_id: userId,
      video_id: videoId,
      clip_index: 0,
      clip_url: videoData.video_url, // Subtitles editor will just play the original video
      subtitles: { subtitles: subtitlesText, words }
    }]);

    if (insertError) {
      console.error("Failed to insert into generated_clips:", insertError);
      return NextResponse.json({ error: "Failed to save generated clips" }, { status: 500 });
    }

    // Mark processing req as completed to satisfy the UI/polling
    const aiAnalysisPayload = {
         recommended_shorts: [{ title_or_hook: "Full Subtitles", start_time: 0, duration_seconds: durationSeconds }]
    };

    const { data: existingReq } = await supabase
      .from("video_processing_req")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();

    if (existingReq?.id) {
      const { error } = await supabase.from("video_processing_req").update({
        status: "completed",
        ai_analysis: aiAnalysisPayload,
      }).eq("id", existingReq.id);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from("video_processing_req").insert({
        video_id: videoId,
        status: "completed",
        ai_analysis: aiAnalysisPayload,
      });
      if (error) console.error(error);
    }

    return NextResponse.json({ success: true, creditsDeducted: creditsCost, videoId });

  } catch (error) {
    console.error("Subtitle Generation Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordsToSubtitleString(words) {
  const onlyWords = words.filter((w) => !w.type || w.type === "word");
  const lines = [];
  let group = [];

  for (let i = 0; i < onlyWords.length; i++) {
    const word = onlyWords[i];
    const nextWord = onlyWords[i + 1];

    group.push(word);

    const gapToNext = nextWord ? nextWord.start - word.end : 999;
    const isNaturalPause = gapToNext > 0.4;
    const isMaxLength = group.length >= 5;
    const isLast = !nextWord;

    if (isMaxLength || isNaturalPause || isLast) {
      const startTimestamp = secondsToTimestamp(group[0].start);
      const text = group
        .map((w, idx) =>
          idx < group.length - 1
            ? w.text.replace(/[,،]$/, "")
            : w.text
        )
        .join(" ")
        .trim();

      if (text) lines.push(`${startTimestamp} ${text}`);
      group = [];
    }
  }

  return lines.join("\n");
}

function secondsToTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `[${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}]`;
}

function pad(n, length = 2) {
  return String(n).padStart(length, "0");
}
