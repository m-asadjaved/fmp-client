import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";

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
			.select("status, ai_analysis")
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
			ai_analysis: reqData?.ai_analysis || null,
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
			.select("duration, gemini_file_uri")
			.eq("video_id", videoId)
			.eq("user_id", userId)
			.single();

		if (videoError || !videoRow) {
			console.error("Error fetching videoRow:", videoError?.message || "No row found");
			return NextResponse.json({ error: videoError?.message || "Video not found" }, { status: 404 });
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

				let final_raw_data = null;
				let clipsToProcess = [];
				let startIndexForNewClips = 0;

				if (!regenerate && videoData?.ai_analysis && videoData.ai_analysis !== "") {
					// Use existing clips
					final_raw_data = safeParseJSON(videoData.ai_analysis);
					if (Array.isArray(final_raw_data.recommended_shorts)) {
						// Old clips shouldn't show the "NEW" badge forever
						final_raw_data.recommended_shorts = final_raw_data.recommended_shorts.map(c => ({ ...c, is_new: false }));
					}
					clipsToProcess = final_raw_data.recommended_shorts || [];
				} else {
					let ai_response_raw;
					try {
						const videoUrlToProcess = videoRow.gemini_file_uri || `${AWS_BUCKET_URL}/raw_videos/${videoId}.mp4`;
						ai_response_raw = await SummarizeUsingAI(
							videoUrlToProcess,
							preferences?.prioritize
						);
					} catch (aiErr) {
						console.error("Gemini processing failed (possibly expired URI):", aiErr);
						// "Touch" the S3 file to re-trigger the upload Lambda
						const s3 = new S3Client({
							region: process.env.AWS_REGION || "us-east-1",
							credentials: {
								accessKeyId: process.env.AWS_ACCESS_KEY_ID,
								secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
							},
						});
						await s3.send(new CopyObjectCommand({
							Bucket: AWS_BUCKET_NAME,
							CopySource: `${AWS_BUCKET_NAME}/raw_videos/${videoId}.mp4`,
							Key: `raw_videos/${videoId}.mp4`,
							MetadataDirective: "REPLACE"
						}));
						throw new Error("Video archive expired. Background re-upload started! Please try again in 1 minute.");
					}

					const new_raw_data = safeParseJSON(ai_response_raw);

					if (
						!Array.isArray(new_raw_data.recommended_shorts) ||
						new_raw_data.recommended_shorts.length === 0
					) {
						throw new Error("AI returned no recommended clips.");
					}

					// Append logic if regenerating
					if (regenerate && videoData?.ai_analysis && videoData.ai_analysis !== "") {
						const existing_data = safeParseJSON(videoData.ai_analysis);
						if (Array.isArray(existing_data.recommended_shorts)) {
							startIndexForNewClips = existing_data.recommended_shorts.length;
							const old_clips = existing_data.recommended_shorts.map(c => ({ ...c, is_new: false }));
							const new_clips = new_raw_data.recommended_shorts.map(c => ({ ...c, is_new: true }));

							final_raw_data = {
								...existing_data,
								recommended_shorts: [...old_clips, ...new_clips]
							};
						} else {
							final_raw_data = {
								...new_raw_data,
								recommended_shorts: new_raw_data.recommended_shorts.map(c => ({ ...c, is_new: true }))
							};
						}
					} else {
						final_raw_data = {
							...new_raw_data,
							recommended_shorts: new_raw_data.recommended_shorts.map(c => ({ ...c, is_new: true }))
						};
					}

					// Process ONLY the newly generated clips (up to 5 to prevent runaway costs)
					clipsToProcess = new_raw_data.recommended_shorts.slice(0, 5);
				}

				const ai_analysis_str = JSON.stringify(final_raw_data);

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

				const lambdaPromises = clipsToProcess.map(async (clip, idx) => {
					// Calculate correct S3 index so we don't overwrite existing clips
					const globalIndex = startIndexForNewClips + idx;

					if (!clip.start_time || !clip.duration_seconds) {
						console.warn(`Clip ${globalIndex} is missing required fields, skipping.`);
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
								s3_output_key: `processed_videos/output-${videoId}-${globalIndex}.mp4`,
								s3_audio_output_key: `processed_audio/${videoId}-${globalIndex}.flac`,
								webhook_url: WEBHOOK_URL_VIDEO_STATUS,
								clip_info,
								full_subtitles: '',
								preferences: {
									...preferences,
									hook_text: clip.title_or_hook || preferences?.hook_text,
									hook_enabled: clip.title_or_hook ? true : preferences?.hook_enabled,
								},
							}),
						}
					);

					if (!lambdaResponse.ok) {
						const body = await lambdaResponse.text().catch(() => "(unreadable)");
						throw new Error(`Lambda ${globalIndex} responded with ${lambdaResponse.status}: ${body}`);
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
		global_video_analysis: {
			type: "object",
			description: "A mandatory analysis of the ENTIRE video to prove you watched the whole thing from start to finish.",
			properties: {
				first_third_summary: { type: "string", description: "Briefly summarize what happens in the first third of the video." },
				middle_third_summary: { type: "string", description: "Briefly summarize what happens in the middle third of the video." },
				final_third_summary: { type: "string", description: "Briefly summarize exactly what happens in the final few minutes/seconds of the video to prove you watched until the very end." }
			},
			required: ["first_third_summary", "middle_third_summary", "final_third_summary"]
		},
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
					duration_seconds: {
						type: "integer",
						minimum: 30,
						maximum: 85,
						description: "MUST BE STRICTLY BETWEEN 30 AND 85. NO EXCEPTIONS."
					},
					title_or_hook: {
						type: "string",
						description: "Catchy, viral hook headline that immediately grabs attention.",
					},
					clip_topic: {
						type: "string",
						description: "The main overarching topic of the clip. If multiple topics are introduced, summarize the entire thematic flow.",
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
						description: "CRITICAL: Accurate, second-by-second intervals specifying when face detection should be active. Must cover the entire clip duration. NO SINGLE INTERVAL CAN EXCEED 5 SECONDS. You MUST break it down into many small chunks. IMPORTANT: Intervals MUST NOT overlap. The start_sec of the next interval must be exactly end_sec + 1 of the previous interval.",
						items: {
							type: "object",
							properties: {
								start_sec: { type: "integer", description: "Start second of this interval (relative to the clip's start)." },
								end_sec: { type: "integer", description: "End second of this interval (relative to the clip's start)." },
								detect_face: { type: "boolean", description: "TRUE ONLY if exactly ONE person is clearly and continuously visible on screen for every single frame of the ENTIRE interval. FALSE if there are multiple people, no people, transitions, B-roll, or ANY ambiguity, even for a split second." }
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
	required: ["global_video_analysis", "recommended_shorts"],
};

export async function SummarizeUsingAI(videoUrl, prioritize = false) {
	try {
		if (!videoUrl) {
			throw new Error("Video URL is required");
		}

		const prompt = `
[SYSTEM DIRECTIVE: STRICT ENFORCEMENT MODE]
You are an elite AI Video Editor and Viral Content Strategist. Your primary directive is to extract hyper-viral, standalone short-form clips (TikTok, YouTube Shorts, Reels) from the provided video. 

FAILURE TO COMPLY WITH THE FOLLOWING STRICT RULES WILL RESULT IN TASK FAILURE.

--- CORE DIRECTIVES (NON-NEGOTIABLE) ---
1. FULL VIDEO DISTRIBUTION (CRITICAL): You MUST watch and process the ENTIRE video from start to finish. To prove you didn't stop watching early, your selected clips MUST be distributed widely across the entire duration. Do NOT cluster all your clips in the first few minutes.
2. INDEPENDENT TOPICS (CRITICAL): You MUST select 3 to 5 completely INDIVIDUAL and UNLINKED clips. 
   - NEVER slice one continuous story or topic into multiple consecutive clips. 
   - If a topic takes 60 seconds to explain, output ONE 60-second clip. Do NOT output two 30-second clips that play back-to-back.
   - Clip 2 CANNOT start exactly where Clip 1 ended. Clips MUST be separated by significant time and context.
3. TIME CONSTRAINTS: EVERY clip MUST be strictly between 30 and 85 seconds long. Clips shorter than 30 seconds or longer than 85 seconds are strictly forbidden. ZERO exceptions.
4. TOPIC RESOLUTION & CONTINUITY: If a topic naturally flows into a related sub-topic, you MUST extend the clip (up to 85s max) to include it. Do not chop it into two separate clips. Keep the entire thought process together in a single clip.
5. DYNAMIC FOCUS: The hook introduces the main subject. Keep the clip going until the thought completely resolves. Do not cut early.

--- SELECTION CRITERIA (STRICT ENFORCEMENT) ---
A valid clip MUST:
- Hook the viewer in the first 3 seconds (curiosity, controversy, emotion, urgency).
- Be 100% understandable WITHOUT any external context.
- End on a definitive payoff, revelation, punchline, or actionable conclusion.

A valid clip MUST NOT contain:
- Slow or boring introductions.
- Greetings, housekeeping, or sponsor reads.
- Dead air, rambling, or repeated information.
- Abrupt endings with no payoff.

--- VISUAL ANALYSIS INSTRUCTIONS (CRITICAL) ---
You are receiving the actual video file. You MUST visually inspect the video frames, do not just rely on audio or transcript context.
1. WATCH THE CAMERA CUTS: You must actively look at the camera cuts, angles, and who is physically visible on screen.
2. BE PAINFULLY ACCURATE: Your face tracking intervals are fed directly to an automatic AI camera cropping algorithm. If you set \`detect_face=TRUE\` when there are multiple people or B-roll, the camera will glitch and fail.

--- OUTPUT & FORMATTING RULES ---
1. SCHEMA COMPLIANCE: Your response MUST STRICTLY conform to the provided JSON schema. Do NOT add any extra fields. EVERY field is mandatory.
2. TIMESTAMPS: \`start_time\` and \`end_time\` MUST use exactly "MM:SS" format and map precisely to the ORIGINAL video timestamps. 
3. DURATION: \`duration_seconds\` MUST accurately reflect the difference between \`start_time\` and \`end_time\`.
4. SECOND-BY-SECOND FACE DETECTION: \`face_detection_intervals\` MUST be visually accurate down to the EXACT SECOND.
   - Break the clip down into small 1-3 second intervals if the camera angles change rapidly. Do NOT use lazy 30-second intervals.
   - INTERVALS CANNOT OVERLAP: If interval 1 is 1 to 3, interval 2 MUST be 4 to 5. Do NOT do 1 to 3 and then 3 to 5.
   - \`detect_face\` = TRUE: STRICTLY ONLY when exactly ONE person is clearly and continuously visible on screen for the ENTIRE interval.
   - \`detect_face\` = FALSE: If there are multiple people, no people, camera transitions, screen shares, B-roll, or ANY ambiguity, you MUST set that specific interval to FALSE. Be aggressively conservative.

RETURN ONLY THE RAW, VALID JSON DATA. DO NOT WRAP IN MARKDOWN OR EXPLANATORY TEXT.
`;

		const interaction = await ai.interactions.create({
			model: "gemini-3.1-flash-lite",
			// model: "gemini-2.5-pro",
			// model: "gemini-3.1-pro-preview",
			input: [
				{
					type: "video",
					uri: videoUrl,
					mime_type: "video/mp4",
				},
				{
					type: "text",
					text: "You are an expert AI video editor and short-form content strategist. CRITICAL: You must actively listen to the audio and analyze the visual frames for the ENTIRE video from start to finish. Do not stop processing early. Whatever the full duration of the video is, you must process 100% of it before responding.",
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
