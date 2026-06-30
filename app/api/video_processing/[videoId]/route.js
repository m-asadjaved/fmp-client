import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL =
	process.env.AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const WEBHOOK_URL_VIDEO_STATUS = process.env.WEBHOOK_URL_VIDEO_STATUS;
const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL;

const supabase = createClient(
	process.env.SUPABASE_URL || "",
	process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── Helper: safe JSON parse ───────────────────────────────────────────────
function safeParseJSON(value) {
	if (typeof value === "object" && value !== null) return value;
	try {
		return JSON.parse(value);
	} catch {
		throw new Error("AI response is not valid JSON. Cannot proceed.");
	}
}

// ─── Helper: insert a processing log (non-fatal) ──────────────────────────
async function insertLog(videoId, current_process, status) {
	const { error } = await supabase
		.from("video_processing_logs")
		.insert([{ video_id: videoId, current_process, status }]);

	if (error) {
		console.warn(
			`[insertLog] Failed to insert log for ${videoId}:`,
			error.message
		);
	}
}

// ─── POST handler ─────────────────────────────────────────────────────────
export async function POST(request, context) {
	try {
		const params = await context.params;
		const { videoId } = params;

		if (!videoId) {
			return NextResponse.json(
				{ error: "Missing videoId in route params." },
				{ status: 400 }
			);
		}

		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized. Please log in." },
				{ status: 401 }
			);
		}

		// ── 1. Fetch existing video record (may not exist yet) ─────────────────
		const { data: videoData, error: fetchError } = await supabase
			.from("video_processing_req")
			.select("*")
			.eq("video_id", videoId)
			.maybeSingle();

		if (fetchError) {
			throw new Error(`DB fetch failed: ${fetchError.message}`);
		}

		// ── 2. Early-exit if already completed ────────────────────────────────
		if (videoData?.status === "completed") {
			return NextResponse.json(
				{
					success: true,
					videoStatus: "exist",
					message:
						"Clips have already been generated for this video.",
				},
				{ status: 200 }
			);
		}

		// ── 3. Early-exit if already being processed ──────────────────────────
		if (videoData?.status === "processing") {
			return NextResponse.json(
				{
					success: true,
					videoStatus: "processing",
					message: "This video is already being processed.",
				},
				{ status: 200 }
			);
		}

		// ── 4. Get or generate AI analysis ────────────────────────────────────
		await insertLog(
			videoId,
			"Send the req to AI for analysis",
			"analyzing"
		);

		let ai_response_raw =
			videoData?.ai_analysis && videoData.ai_analysis !== ""
				? videoData.ai_analysis
				: await SummarizeUsingAI(
						`${AWS_BUCKET_URL}/raw_videos/${videoId}.mp4`
				  );

		const raw_data = safeParseJSON(ai_response_raw);

		// Normalise to string for DB storage
		const ai_analysis_str =
			typeof ai_response_raw === "string"
				? ai_response_raw
				: JSON.stringify(ai_response_raw);

		if (
			!Array.isArray(raw_data.recommended_shorts) ||
			raw_data.recommended_shorts.length === 0
		) {
			throw new Error("AI returned no recommended clips.");
		}

		if (!raw_data.full_subtitles) {
			throw new Error("AI response is missing full_subtitles.");
		}

		// ── 5. Upsert the video_processing_req row (INSERT or UPDATE) ─────────
		const { data: videoReqData, error: upsertError } = await supabase
			.from("video_processing_req")
			.insert({
				video_id: videoId,
				status: "processing",
				ai_analysis: ai_analysis_str,
			})
			.select("id")
			.single();

		if (upsertError || !videoReqData) {
			throw new Error(
				`Failed to upsert video_processing_req: ${
					upsertError?.message ?? "no data returned"
				}`
			);
		}

		// ── 6. Build clip payload ─────────────────────────────────────────────
		const firstClip = raw_data.recommended_shorts[0];

		if (!firstClip.start_time || !firstClip.duration_seconds) {
			throw new Error(
				"AI clip is missing required fields: start_time or duration_seconds."
			);
		}

		const clip_info = {
			start_time: firstClip.start_time,
			duration_seconds: firstClip.duration_seconds,
		};

		// ── 7. Trigger Lambda ─────────────────────────────────────────────────
		await insertLog(
			videoId,
			"Send the video to edit engine for video editing",
			"editing"
		);

		if (!AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL) {
			throw new Error("AWS Lambda URL is not configured.");
		}

		const lambdaResponse = await fetch(
			AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					req_id: videoReqData.id,
					user_id: userId,
					s3_bucket: AWS_BUCKET_NAME,
					s3_input_key: `raw_videos/${videoId}.mp4`,
					s3_output_key: `processed_videos/output-${videoId}.mp4`,
					webhook_url: WEBHOOK_URL_VIDEO_STATUS,
					clip_info,
					full_subtitles: '',
				}),
			}
		);

		if (!lambdaResponse.ok) {
			const body = await lambdaResponse
				.text()
				.catch(() => "(unreadable)");
			throw new Error(
				`Lambda responded with ${lambdaResponse.status}: ${body}`
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[POST /video/:videoId]", error);
		return NextResponse.json(
			{ success: false, error: error.message },
			{ status: 500 }
		);
	}
}

// ─── Gemini AI helper (unchanged) ─────────────────────────────────────────
const ai = new GoogleGenAI({});

const summaryJsonSchema = {
	type: "object",
	properties: {
		recommended_shorts: {
			type: "array",
			description:
				"Must contain exactly ONE object representing the single best viral clip from the video.",
			items: {
				type: "object",
				properties: {
					clip_number: { type: "integer" },
					start_time: {
						type: "string",
						description: "Timestamp format MM:SS",
					},
					end_time: {
						type: "string",
						description: "Timestamp format MM:SS",
					},
					duration_seconds: { type: "integer" },
					title_or_hook: {
						type: "string",
						description: "Catchy, viral hook headline.",
					},
					rationale: {
						type: "string",
						description:
							"Detailed explanation of why this specific segment makes the best standalone short-form clip.",
					},
				},
				required: [
					"clip_number",
					"start_time",
					"end_time",
					"duration_seconds",
					"title_or_hook",
					"rationale",
				],
			},
		},
		full_subtitles: {
			type: "string",
			description:
				"[00:00:00.000] subtitle text here [00:00:05.456] next line of subtitle text...",
		},
	},
	required: ["recommended_shorts", "full_subtitles"],
};

export async function SummarizeUsingAI(videoUrl) {
	try {
		if (!videoUrl) {
			throw new Error("Video URL is required");
		}

		const prompt = `
		
You are a world-class AI video editor, viral content strategist, and audience retention expert specializing in TikTok, YouTube Shorts, and Instagram Reels.

Your task is to analyze the complete video transcript and metadata, then select EXACTLY ONE clip that has the highest probability of maximizing audience retention, watch time, engagement, and shareability.

The selected clip MUST work as a standalone short-form video without requiring additional context.

The final clip duration MUST be between 45 and 57 seconds.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Identify the single strongest section of the video based on storytelling quality, emotional impact, curiosity, entertainment value, educational value, or surprise.

Prioritize clips that naturally encourage viewers to keep watching until the end.

Do NOT simply choose the first interesting section. Search the entire transcript before making a decision.

--------------------------------------------------
SELECTION CRITERIA (Highest Priority First)
--------------------------------------------------

The chosen clip should satisfy as many of these criteria as possible:

1. Opens with a compelling hook within the first 3 seconds.
   The hook should immediately create curiosity, surprise, emotion, controversy, urgency, or a strong promise.

2. Contains a complete narrative.
   The clip should have:
   - Hook
   - Build-up
   - Payoff or conclusion

3. Requires little or no external context.

4. Maintains consistent engagement throughout.

5. Contains no unnecessary filler, greetings, pauses, repetitions, or off-topic discussion.

6. Ends on a satisfying payoff, revelation, punchline, or actionable insight.

7. Is highly suitable for vertical short-form platforms.

Avoid selecting clips that:

- start slowly
- require previous context
- contain long introductions
- include sponsor messages
- include housekeeping
- contain dead air
- include repeated information
- end abruptly without payoff

--------------------------------------------------
TRANSCRIPT EXTRACTION
--------------------------------------------------

Extract ONLY the spoken dialogue contained inside the selected clip.

Do NOT include dialogue before or after the selected boundaries.

Subtitle requirements:

• Maximum 5 words per subtitle segment
• Split naturally at speech pauses
• Never split words
• Never merge unrelated phrases
• Preserve the speaker's original wording
• Do not paraphrase
• Do not summarize
• Do not censor unless explicitly instructed

Each subtitle should be easy to read in under one second whenever possible.

--------------------------------------------------
TIMESTAMP REQUIREMENTS
--------------------------------------------------

Subtitle timestamps must be extremely accurate.

Every subtitle segment should begin exactly when the first spoken word starts.

Do NOT estimate timings using sentence averages.

Synchronize each subtitle segment precisely with the spoken audio.

--------------------------------------------------
TIMESTAMP NORMALIZATION
--------------------------------------------------

Treat the selected clip as an independent video.

Normalize timestamps so the first spoken word begins at:

00:00:00.000

All remaining timestamps must be relative to this new timeline.

Example:

Original clip:
01:12:18.250 → 01:13:05.800

Output:

00:00:00.000 → 00:00:47.550
--------------------------------------------------
OUTPUT REQUIREMENTS
--------------------------------------------------

Your response MUST strictly conform to the provided response schema.

Do NOT generate any fields that are not defined in the schema.

Populate every required field.

Requirements:

• recommended_shorts MUST contain EXACTLY ONE object.
• That object must represent the single highest-scoring short-form clip in the entire video.
• The selected clip duration MUST be between 45 and 57 seconds.
• start_time and end_time MUST use MM:SS format and refer to the timestamps in the ORIGINAL video.
• duration_seconds MUST equal the actual clip length.
• title_or_hook should be a concise, attention-grabbing headline suitable for TikTok, YouTube Shorts, or Instagram Reels.
• rationale should explain why this segment was selected, referencing factors such as hook strength, audience retention, narrative completeness, emotional impact, educational value, surprise, shareability, or viral potential.

--------------------------------------------------
FULL_SUBTITLES REQUIREMENTS
--------------------------------------------------

The full_subtitles field must contain ONLY the subtitles for the selected clip.

Requirements:

• Normalize timestamps so the selected clip starts at [00:00:00.000].
• Every timestamp must use the format [HH:MM:SS.mmm].
• Include ONLY dialogue spoken inside the selected clip.
• Do NOT include dialogue before or after the clip.
• Preserve the original wording exactly.
• Do NOT paraphrase.
• Do NOT summarize.
• Split subtitles into natural speech segments.
• Each subtitle segment MUST contain no more than 5 spoken words.
• Each timestamp must begin exactly when the first spoken word starts.
• Synchronize timestamps as accurately as possible with the spoken audio.

Return ONLY the structured response defined by the provided schema.

`;

		const interaction = await ai.interactions.create({
			model: "gemini-3.1-flash-lite",
			// model: "gemini-2.5-pro",
			input: [
				{
					type: "video",
					uri: videoUrl,
					mime_type: "video/mp4",
				},
				{
					type: "text",
					text: "You are an expert AI video editor and short-form content strategist.",
				},
			],
			system_instruction:
				prompt,
			response_format: {
				type: "text",
				mime_type: "application/json",
				schema: summaryJsonSchema,
			},
		});

		console.log(interaction.output_text);

		return interaction.output_text;
	} catch (error) {
		console.error("Gemini API Error:", error);
		throw error;
	}
}
