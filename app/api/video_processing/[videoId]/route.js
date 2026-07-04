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

// ─── GET handler (Fetch status and cost) ──────────────────────────────────
export async function GET(request, context) {
	try {
		const params = await context.params;
		const { videoId } = params;

		if (!videoId) {
			return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
		}

		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Fetch processing status
		const { data: reqData } = await supabase
			.from("video_processing_req")
			.select("status")
			.eq("video_id", videoId)
			.maybeSingle();

		// Fetch video duration
		const { data: videoData, error: videoError } = await supabase
			.from("videos")
			.select("duration, credits_used")
			.eq("video_id", videoId)
			.eq("user_id", userId)
			.single();

		if (videoError || !videoData) {
			return NextResponse.json({ error: "Video not found or unauthorized" }, { status: 404 });
		}

		const durationSeconds = parseFloat(videoData.duration);
		// Cost: 1 credit per 20 minutes (1200 seconds) (rounded up), minimum 1 credit
		const creditsCost = Math.max(1, Math.ceil(durationSeconds / 1200));

		return NextResponse.json({
			status: reqData?.status || "none",
			duration: durationSeconds,
			creditsCost,
			creditsUsed: videoData.credits_used || 0
		});
	} catch (error) {
		console.error("[GET /api/video_processing/:videoId]", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
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

		const body = await request.json();
		const { regenerate, preferences } = body;

		// ── 1. Fetch existing video record (may not exist yet) ─────────────────
		// Sort by created_at descending and get the most recent one to avoid maybeSingle() crash
		const { data: videoDataArray, error: fetchError } = await supabase
			.from("video_processing_req")
			.select("*")
			.eq("video_id", videoId)
			.order("created_at", { ascending: false })
			.limit(1);

		if (fetchError) {
			throw new Error(`DB fetch failed: ${fetchError.message}`);
		}

		const videoData = videoDataArray && videoDataArray.length > 0 ? videoDataArray[0] : null;

		// ── 2. Early-exit if already completed ────────────────────────────────
		if (!regenerate && videoData?.status === "completed") {
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
		if (!regenerate && videoData?.status === "processing") {
			return NextResponse.json(
				{
					success: true,
					videoStatus: "processing",
					message: "This video is already being processed.",
				},
				{ status: 200 }
			);
		}

		// ── 4. Calculate Credits Cost ───────────────────────────────────────────
		const { data: videoRow, error: videoError } = await supabase
			.from("videos")
			.select("duration")
			.eq("video_id", videoId)
			.eq("user_id", userId)
			.single();

		if (videoError || !videoRow) {
			return NextResponse.json({ error: "Video not found" }, { status: 404 });
		}

		const durationSeconds = parseFloat(videoRow.duration);
		let creditsCost = Math.max(1, Math.ceil(durationSeconds / 1200));
		if (preferences?.prioritize) {
			creditsCost += 2;
		}

		// Check user balance
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
				{ error: `Insufficient credits. This video requires ${creditsCost} credits, but you only have ${userCredits.balance} available.` },
				{ status: 402 }
			);
		}

		// ── 5. Deduct Credits ──────────────────────────────────────────────────
		const newBalance = userCredits.balance - creditsCost;

		const { error: updateError } = await supabase
			.from("user_credits")
			.update({ balance: newBalance })
			.eq("user_id", userId);

		if (updateError) {
			throw new Error("Failed to deduct credits");
		}

		await supabase.from("credit_transactions").insert({
			user_id: userId,
			amount: -creditsCost,
			description: `Processed AI clips for video (${Math.round(durationSeconds)}s)`
		});

		await supabase.from("videos").update({ credits_used: creditsCost }).eq("video_id", videoId);

		// ── 6. Upsert the video_processing_req row (INSERT or UPDATE) ─────────
		let videoReqData, upsertError;

		if (videoData && videoData.id) {
			const result = await supabase
				.from("video_processing_req")
				.update({
					status: "processing",
				})
				.eq("id", videoData.id)
				.select("id")
				.single();
			videoReqData = result.data;
			upsertError = result.error;
		} else {
			const result = await supabase
				.from("video_processing_req")
				.insert({
					video_id: videoId,
					status: "processing",
				})
				.select("id")
				.single();
			videoReqData = result.data;
			upsertError = result.error;
		}

		if (upsertError || !videoReqData) {
			throw new Error(
				`Failed to upsert video_processing_req: ${upsertError?.message ?? "no data returned"}`
			);
		}

		// Return early so the UI updates to processing immediately
		const earlyResponse = NextResponse.json({ success: true, videoStatus: "processing" });

		// ── 7. Get or generate AI analysis (BACKGROUND) ───────────────────────
		(async () => {
			try {
				await insertLog(
					videoId,
					"Send the req to AI for analysis",
					"analyzing"
				);

				let ai_response_raw =
					(!regenerate && videoData?.ai_analysis && videoData.ai_analysis !== "")
						? videoData.ai_analysis
						: await SummarizeUsingAI(
							`${AWS_BUCKET_URL}/raw_videos/${videoId}.mp4`,
							preferences?.prioritize
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

				// Update the request with AI analysis
				await supabase
					.from("video_processing_req")
					.update({
						ai_analysis: ai_analysis_str,
					})
					.eq("id", videoReqData.id);

				// ── 8. Build clip payload ─────────────────────────────────────────────
				if (!AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL) {
					throw new Error("AWS Lambda URL is not configured.");
				}

				await insertLog(
					videoId,
					"Send the video to edit engine for video editing",
					"editing"
				);

				// Process up to 5 clips concurrently to prevent runaway costs
				const clipsToProcess = raw_data.recommended_shorts.slice(0, 5);

				const lambdaPromises = clipsToProcess.map(async (clip, index) => {
					if (!clip.start_time || !clip.duration_seconds) {
						console.warn(`Clip ${index} is missing required fields, skipping.`);
						return null;
					}

					const clip_info = {
						start_time: clip.start_time,
						duration_seconds: clip.duration_seconds,
						face_detection_intervals: clip.face_detection_intervals || [],
					};

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
								s3_output_key: `processed_videos/output-${videoId}-${index}.mp4`,
								webhook_url: WEBHOOK_URL_VIDEO_STATUS,
								clip_info,
								full_subtitles: '',
								preferences,
							}),
						}
					);

					if (!lambdaResponse.ok) {
						const body = await lambdaResponse.text().catch(() => "(unreadable)");
						throw new Error(`Lambda ${index} responded with ${lambdaResponse.status}: ${body}`);
					}

					return true;
				});

				await Promise.all(lambdaPromises);

			} catch (err) {
				console.error("[Background Processing Error]", err);
				
				// Update DB to failed
				await supabase.from("video_processing_req").update({ status: "failed" }).eq("id", videoReqData.id);
				
				// Broadcast error to webhook
				try {
					const protocol = request.headers.get("x-forwarded-proto") || "http";
					const host = request.headers.get("host") || "localhost:3000";
					await fetch(`${protocol}://${host}/api/webhook/clips`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ 
							req_id: videoReqData.id, 
							status: 'FAILED', 
							error: err.message || "An error occurred during AI processing" 
						})
					});
				} catch (webhookErr) {
					console.error("Failed to trigger error webhook", webhookErr);
				}
			}
		})();

		return earlyResponse;
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
				"Must contain an array of objects representing the best viral clips identified from the video.",
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
						description: "Catchy, viral hook headline that immediately grabs attention.",
					},
					clip_topic: {
						type: "string",
						description: "A single, crystal-clear topic that the entire clip revolves around. Must be directly related to the hook. Example: 'Why sleep deprivation destroys memory' or 'The hidden cost of free shipping'. ONE topic only — no compound subjects.",
					},
					rationale: {
						type: "string",
						description: "Explanation of why this segment makes the best standalone short-form clip.",
					},
					virality_score: {
						type: "integer",
						description: "A score from 0 to 100 representing the viral potential of this clip.",
					},
					face_detection_intervals: {
						type: "array",
						description: "Intervals specifying when face detection should be active within this clip.",
						items: {
							type: "object",
							properties: {
								start_sec: { type: "integer", description: "Start second of this interval (relative to the clip's start)." },
								end_sec: { type: "integer", description: "End second of this interval (relative to the clip's start)." },
								detect_face: { type: "boolean", description: "True ONLY if exactly ONE person is clearly visible on the screen for the ENTIRE interval. Be extremely conservative. If there is any ambiguity, transition, or if a second person appears even for a fraction of a second, this MUST be false." }
							},
							required: ["start_sec", "end_sec", "detect_face"]
						}
					},
				},
				required: [
					"clip_number",
					"start_time",
					"end_time",
					"duration_seconds",
					"title_or_hook",
					"clip_topic",
					"rationale",
					"virality_score",
					"face_detection_intervals",
				],
			},
		},
	},
	required: ["recommended_shorts"],
};

export async function SummarizeUsingAI(videoUrl, prioritize = false) {
	try {
		if (!videoUrl) {
			throw new Error("Video URL is required");
		}

		const prompt = `
		
You are a world-class AI video editor, viral content strategist, and audience retention expert specializing in TikTok, YouTube Shorts, and Instagram Reels.

Your task is to analyze the complete video transcript and metadata, then identify 3 to 5 distinct clips (if the video is long enough) that have a very high probability of maximizing audience retention, watch time, engagement, and shareability. (If the video is short or lacks enough good segments, 1 or 2 clips is acceptable, but always aim for 3 to 5).

Each selected clip MUST work as a standalone short-form video without requiring additional context.

The duration for EACH clip MUST be under 85 seconds maximum.
CRITICAL: Each clip must fully clear and resolve its topic from start to end within this 85-second window. With this extended duration, any topic should be able to be cleared easily. Do not leave the topic hanging or incomplete.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Identify the strongest sections of the video based on storytelling quality, emotional impact, curiosity, entertainment value, educational value, or surprise.

Prioritize clips that naturally encourage viewers to keep watching until the end.

--------------------------------------------------
SELECTION CRITERIA (Highest Priority First)
--------------------------------------------------

Each chosen clip should satisfy as many of these criteria as possible:

1. Opens with a compelling hook within the first 3 seconds.
   The hook must immediately create curiosity, surprise, emotion, controversy, urgency, or a strong promise.
   CRITICAL: Each clip must cover EXACTLY ONE clear topic that is directly related to its hook.
   Do NOT select clips that jump between multiple subjects. The hook promises one thing — the clip must deliver exactly that one thing.

2. Contains a complete narrative that clears the single topic from start to finish within the clip.

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
TIMESTAMP NORMALIZATION
--------------------------------------------------

Treat each selected clip as an independent video.

Normalize timestamps so the first spoken word begins at:

00:00:00.000

--------------------------------------------------
OUTPUT REQUIREMENTS
--------------------------------------------------

Your response MUST strictly conform to the provided response schema.

Do NOT generate any fields that are not defined in the schema.

Populate every required field.

Requirements:

• recommended_shorts MUST contain between 3 and 5 highly viral clips if the video is long enough. (If the video is short, 1 or 2 clips is acceptable, but always aim for 3 to 5).
• Each selected clip duration MUST be under 85 seconds maximum and fully clear the topic.
• start_time and end_time MUST use MM:SS format and refer to the timestamps in the ORIGINAL video.
• duration_seconds MUST equal the actual clip length.
• title_or_hook should be a concise, attention-grabbing headline suitable for TikTok, YouTube Shorts, or Instagram Reels.
• rationale should explain why this segment was selected, referencing factors such as hook strength, audience retention, narrative completeness, emotional impact, educational value, surprise, shareability, or viral potential.
• virality_score MUST be an integer from 0 to 100 assessing the probability that this clip will go viral based on the current algorithm trends.
• face_detection_intervals MUST be an array that covers the entire duration of the clip. Each item should specify the start_sec, end_sec, and a boolean detect_face. IMPORTANT: You must be extremely precise and conservative with detect_face. It MUST be true ONLY if there is EXACTLY ONE person clearly visible on the screen for the ENTIRE interval. If there is any ambiguity, transition, or if a second person appears even for a fraction of a second, you MUST set detect_face to false for that time buffer. For example, if two people are visible from 0 to 4.5 seconds, and then exactly one person is visible from 4.5 to 7 seconds, you must be conservative and output false from 0 to 5 seconds, and true ONLY from 5 to 7 seconds. Never output true unless you are 100% certain only one person is on screen.

Return ONLY the structured response defined by the provided schema.

`;

		const interaction = await ai.interactions.create({
			// model: "gemini-3.1-flash-lite",
			// model: "gemini-2.5-pro",
			model: "gemini-3.1-pro-preview",
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
			service_tier: prioritize ? "standard" : "flex",
		});

		console.log(interaction.output_text);

		return interaction.output_text;
	} catch (error) {
		console.error("Gemini API Error:", error);
		throw error;
	}
}
