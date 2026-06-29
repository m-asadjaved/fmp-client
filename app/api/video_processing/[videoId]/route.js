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
					full_subtitles: raw_data.full_subtitles,
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
				"[00:00:00] subtitle text here [00:00:05] next line of subtitle text...",
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
        You are an expert AI video editor and short-form content strategist. Analyze the provided video transcript and metadata to identify exactly ONE highly engaging, high-retention segment optimized for TikTok, YouTube Shorts, or Instagram Reels.

		Your output must be a single, valid JSON object. Do not include conversational filler, introductory text, markdown code block wrappers (unless explicitly requested by the parser), or post-processing explanations.

		### Performance Requirements:
		1. Selection Rigor: Identify exactly ONE clip that contains a strong hook within the first 3 seconds and a cohesive narrative arc or punchline.
		2. Transcription Scope & Pacing: Extract and transcribe ONLY the spoken dialogue occurring between the clip's start and end boundaries. 
		- Chunking Limit: Each individual subtitle line/segment MUST contain a maximum of 5 words to ensure high-impact, rapid-fire readability.
		3. Micro-Accurate Timing: Timestamps must be hyper-precise, capturing the exact second a phrase begins. Do not average out timings across long sentences; synchronize each 1-5 word chunk perfectly with the audio baseline.
		4. Timestamp Normalization (Zero-Indexing): Normalize the subtitle timeline so that the clip functions as a standalone video. 
		- The first spoken word of the chosen clip must start precisely at [00:00:00].
		- All subsequent timestamps within the clip must be offset relative to this new zero baseline (i.e., New Timestamp = Original Timestamp - Clip Start Time).`;

		const interaction = await ai.interactions.create({
			model: "gemini-3.1-flash-lite",
			input: [
				{
					type: "video",
					uri: videoUrl,
					mime_type: "video/mp4",
				},
				{
					type: "text",
					text: prompt,
				},
			],
			system_instruction:
				"You are an expert AI video editor and short-form content strategist.",
			response_format: {
				type: "text",
				mime_type: "application/json",
				schema: summaryJsonSchema,
			},
		});

		return interaction.output_text;
	} catch (error) {
		console.error("Gemini API Error:", error);
		throw error;
	}
}
