import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GoogleGenAI } from '@google/genai';

const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request, context) {
  try {
    const params = await context.params;
    const { id, clipIndex } = params;

    if (!id || clipIndex === undefined) {
      return NextResponse.json(
        { error: "Missing videoId or clipIndex in route params." },
        { status: 400 }
      );
    }

    const index = parseInt(clipIndex, 10);

    const { data, error: fetchError } = await supabase
      .from("generated_clips")
      .select("*")
      .eq("video_id", id)
      .eq("clip_index", index)
      .limit(1);

    if (fetchError) throw new Error(`DB fetch failed: ${fetchError.message}`);
    const clipData = data && data.length > 0 ? data[0] : null;
    if (!clipData) {
      return NextResponse.json(
        { error: "Clip record not found in generated_clips." },
        { status: 404 }
      );
    }

    if (clipData.roman_subtitles) {
      return NextResponse.json({ ...clipData.subtitles, roman: clipData.roman_subtitles }, { status: 200 });
    }
    if (clipData.subtitles) {
      return NextResponse.json(clipData.subtitles, { status: 200 });
    }

    // Not cached, so generate it
    const audioUrl = `${AWS_BUCKET_URL}/processed_audio/${id}-${clipIndex}.flac`;
    const { subtitles, words } = await transcribeWithElevenLabs(audioUrl);

    // Save back to DB
    await supabase
      .from("generated_clips")
      .update({ subtitles: { subtitles, words } })
      .eq("id", clipData.id);

    return NextResponse.json({ subtitles, words }, { status: 200 });
  } catch (error) {
    console.error(`[GET /video/subtitles/v2/:id/:clipIndex]`, error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

// ─── ElevenLabs transcription ─────────────────────────────────────────────────
async function transcribeWithElevenLabs(audioUrl) {

  // 1. Fetch audio from S3
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio from S3: ${audioResponse.statusText}`);
  }
  const audioBuffer = await audioResponse.arrayBuffer();

  // 2. Send to ElevenLabs Speech-to-Text
  const audioBlob = new Blob([audioBuffer], { type: "audio/flac" });

  const data = await elevenlabs.speechToText.convert({
    file: audioBlob,
    modelId: "scribe_v2",
    timestampsGranularity: "word"
  });

  const words = data.words
    .filter(w => w.type === "word")
    .map(w => ({ text: w.text, start: w.start, end: w.end }));

  return {
    subtitles: wordsToSubtitleString(data.words),
    words,
  };
}

// ─── Convert word-level data → subtitle string ────────────────────────────────
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

// ─── Format seconds → [HH:MM:SS.mmm] ────────────────────────────────────────
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

// ─── POST handler (Translation) ────────────────────────────────────────────────
export async function POST(request, context) {
  try {
    const params = await context.params;
    const { id, clipIndex } = params;
    const body = await request.json();

    if (!id || clipIndex === undefined) {
      return NextResponse.json({ error: "Missing videoId or clipIndex" }, { status: 400 });
    }

    if (body.action !== "translateToRomanHindi") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!body.words || !Array.isArray(body.words)) {
      return NextResponse.json({ error: "Missing or invalid words array" }, { status: 400 });
    }

    const index = parseInt(clipIndex, 10);

    // Verify clip exists
    const { data, error: fetchError } = await supabase
      .from("generated_clips")
      .select("id, roman_subtitles")
      .eq("video_id", id)
      .eq("clip_index", index)
      .limit(1);
      
    const clipData = data && data.length > 0 ? data[0] : null;
    if (fetchError || !clipData) {
      return NextResponse.json({ error: "Clip record not found." }, { status: 404 });
    }

    // Check if roman_subtitles already exist to save Gemini API call
    if (clipData.roman_subtitles) {
      return NextResponse.json(clipData.roman_subtitles, { status: 200 });
    }

    // Call Gemini to translate
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a professional Hindi translator. I will provide a JSON array of words. Your task is to translate ONLY the "text" field of each word from Devanagari Hindi into Roman Hindi like convert the hindi words into english letters of hindi. 
DO NOT change the structure of the JSON.
DO NOT change the "start" or "end" values.
Return ONLY valid JSON, nothing else.

Input JSON:
${JSON.stringify(body.words)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let translatedWords;
    try {
      let resultText = typeof response.text === 'function' ? response.text() : response.text;

      const jsonMatch = resultText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        translatedWords = JSON.parse(jsonMatch[0]);
      } else {
        translatedWords = JSON.parse(resultText);
      }
    } catch (e) {
      console.error("Failed to parse Gemini response:", e, response);
      return NextResponse.json({ error: "Failed to parse translation from AI." }, { status: 500 });
    }

    // Generate new VTT subtitle string
    const newSubtitles = wordsToSubtitleString(translatedWords);
    const romanSubtitlesObj = { subtitles: newSubtitles, words: translatedWords };

    // Save back to DB under roman_subtitles column
    await supabase
      .from("generated_clips")
      .update({ roman_subtitles: romanSubtitlesObj })
      .eq("id", clipData.id);

    return NextResponse.json(romanSubtitlesObj, { status: 200 });

  } catch (error) {
    console.error(`[POST /video/subtitles/v2/:id/:clipIndex]`, error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
