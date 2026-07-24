import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { S3Client, CopyObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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
		const cleaned = String(value).trim().replace(/^```json\s*/i, "").replace(/```$/, "");
		return JSON.parse(cleaned);
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
		// Cost: 1 credit per minute (60 seconds) (rounded up), minimum 1 credit
		const creditsCost = Math.max(1, Math.ceil(durationSeconds / 60));

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
		const { regenerate, preferences, processingMode = "video", trimRange } = body;

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
			.select("duration, gemini_file_uri, file_key")
			.eq("video_id", videoId)
			.eq("user_id", userId)
			.single();

		if (videoError || !videoRow) {
			console.error("Error fetching videoRow:", videoError?.message || "No row found");
			return NextResponse.json({ error: videoError?.message || "Video not found" }, { status: 404 });
		}

		const durationSeconds = typeof videoRow.duration === "string" 
			? parseFloat(videoRow.duration) 
			: videoRow.duration;

		// ── Credit cost uses trimRange if provided (matches frontend logic) ─────
		// Frontend: trimDuration <= 300 → 5 credits, else ceil(trimDuration / 60)
		let baseCost;
		if (Array.isArray(trimRange) && trimRange.length === 2) {
			const trimDuration = Math.max(0, trimRange[1] - trimRange[0]);
			baseCost = trimDuration <= 300 ? 5 : Math.ceil(trimDuration / 60);
		} else {
			// Fallback: use full video duration
			baseCost = Math.max(1, Math.ceil(durationSeconds / 60));
		}
		let creditsCost = Math.max(1, baseCost);
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

		// Use a small float tolerance to avoid false negatives from double precision arithmetic
		const roundedBalance = Math.floor(userCredits.balance * 100) / 100;
		if (roundedBalance < creditsCost) {
			return NextResponse.json(
				{ error: `Insufficient credits. This video requires ${creditsCost} credits, but you only have ${Math.floor(userCredits.balance)} available.` },
				{ status: 402 }
			);
		}

		// ── 5. Deduct Credits (Skip if retrying with existing AI response) ────
		let shouldDeductCredits = true;
		if (!regenerate && videoData?.ai_analysis && videoData.ai_analysis !== "") {
			shouldDeductCredits = false;
		}

		if (shouldDeductCredits) {
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
		}

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
						if (processingMode === "audio") {
							// ── Audio-Only Mode: download raw audio from S3, upload to Gemini File API ──
							console.log(`[Audio Mode] Uploading audio for video ${videoId} to Gemini File API...`);
							const { fileUri: audioUri, mimeType: audioMimeType } = await uploadAudioToGemini(videoId);
							console.log(`[Audio Mode] Audio uploaded. URI: ${audioUri}`);
							ai_response_raw = await SummarizeUsingAI(audioUri, audioMimeType, preferences);
						} else {
							// ── Video Mode (default): use existing Gemini video URI ─────────────────
							const videoUrlToProcess = videoRow.gemini_file_uri;
							if (!videoUrlToProcess) {
								throw new Error("Gemini File URI is missing. Cannot process AWS URL directly via fileData.");
							}
							ai_response_raw = await SummarizeUsingAI(videoUrlToProcess, "video/mp4", preferences);
						}
					} catch (aiErr) {
						console.error("Gemini processing failed:", aiErr);
						if (processingMode !== "audio") {
							// For video mode only: "touch" the S3 file to re-trigger the upload Lambda
							try {
								const s3 = new S3Client({
									region: process.env.AWS_REGION || "us-east-1",
									credentials: {
										accessKeyId: process.env.AWS_ACCESS_KEY_ID,
										secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
									},
								});
								await s3.send(new CopyObjectCommand({
									Bucket: AWS_BUCKET_NAME,
									CopySource: `${AWS_BUCKET_NAME}/${videoRow.file_key}`,
									Key: videoRow.file_key,
									MetadataDirective: "REPLACE"
								}));
							} catch (_) { /* ignore S3 touch error */ }
							throw new Error("Video archive expired. Background re-upload started! Please try again in 1 minute.");
						}
						throw aiErr;
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
						edits: clip.edits || [],
						// Dummy interval to prevent AWS Lambda from crashing with "list index out of range"
						face_detection_intervals: [
							{ start_sec: 0, end_sec: 9999, is_focus_a_face: true, focus_bounding_box: [0, 0, 1000, 1000] }
						]
					};

					let req_body = JSON.stringify({
						req_id: videoReqData.id,
						user_id: userId,
						s3_bucket: AWS_BUCKET_NAME,
						s3_input_key: videoRow.file_key,
						s3_output_key: `processed_videos/output-${videoId}-${globalIndex}.mp4`,
						s3_audio_output_key: `processed_audio/${videoId}-${globalIndex}.flac`,
						webhook_url: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/api/webhooks/clips?clip_index=${globalIndex}`,
						clip_info,
						full_subtitles: '',
						preferences: {
							...preferences,
							hook_text: clip.title_or_hook || preferences?.hook_text,
							hook_enabled: clip.title_or_hook ? true : preferences?.hook_enabled,
						},
					});

					console.log(req_body);

					const lambdaResponse = await fetch(
						AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: req_body,
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
					await fetch(`${protocol}://${host}/api/webhooks/clips`, {
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

// ─── Helper: Stream S3 audio → upload to Gemini File API ───────────────────
async function uploadAudioToGemini(videoId) {
	const s3 = new S3Client({
		region: process.env.AWS_REGION || "us-east-1",
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		},
	});

	// Try common audio extensions in order
	const audioExtensions = [
		{ key: `raw_audio/${videoId}.mp3`, mimeType: "audio/mpeg" },
		{ key: `raw_audio/${videoId}.m4a`, mimeType: "audio/mp4" },
		{ key: `raw_audio/${videoId}.flac`, mimeType: "audio/flac" },
		{ key: `raw_audio/${videoId}.aac`, mimeType: "audio/aac" },
		{ key: `raw_audio/${videoId}.wav`, mimeType: "audio/wav" },
		{ key: `raw_audio/${videoId}`, mimeType: "audio/mpeg" }, // fallback: no extension
	];

	let audioBuffer = null;
	let audioMimeType = "audio/mpeg";

	for (const { key, mimeType } of audioExtensions) {
		try {
			const cmd = new GetObjectCommand({ Bucket: AWS_BUCKET_NAME, Key: key });
			const result = await s3.send(cmd);
			// Stream → Buffer
			const chunks = [];
			for await (const chunk of result.Body) {
				chunks.push(chunk);
			}
			audioBuffer = Buffer.concat(chunks);
			audioMimeType = mimeType;
			console.log(`[uploadAudioToGemini] Found audio at s3://${AWS_BUCKET_NAME}/${key} (${audioBuffer.length} bytes, ${mimeType})`);
			break;
		} catch (e) {
			// Key not found — try next extension
			if (e.name !== "NoSuchKey" && e.$metadata?.httpStatusCode !== 404) {
				throw e; // Re-throw unexpected errors
			}
		}
	}

	if (!audioBuffer) {
		throw new Error(`Audio file not found in S3 for video ${videoId}. Expected at raw_audio/${videoId}.[mp3|m4a|flac|aac|wav]`);
	}

	// Upload to Gemini File API
	const blob = new Blob([audioBuffer], { type: audioMimeType });
	const uploadResult = await ai.files.upload({
		file: blob,
		config: { mimeType: audioMimeType, displayName: `audio-${videoId}` },
	});

	// Poll until ACTIVE (Gemini processes the file)
	let geminiFile = await ai.files.get({ name: uploadResult.name });
	let pollAttempts = 0;
	while (geminiFile.state === "PROCESSING" && pollAttempts < 30) {
		await new Promise(r => setTimeout(r, 3000));
		geminiFile = await ai.files.get({ name: uploadResult.name });
		pollAttempts++;
	}

	if (geminiFile.state !== "ACTIVE") {
		throw new Error(`Gemini file upload failed or timed out. State: ${geminiFile.state}`);
	}

	console.log(`[uploadAudioToGemini] File ACTIVE. URI: ${geminiFile.uri}`);
	return { fileUri: geminiFile.uri, mimeType: audioMimeType };
}

// ─── Gemini AI helper ─────────────────────────────────────────────────────
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
					duration_seconds: {
						type: "integer",
						minimum: 30,
						maximum: 85,
						description: "MUST BE STRICTLY BETWEEN 30 AND 85. NO EXCEPTIONS."
					},
					title_or_hook: {
						type: "string",
						description: "Catchy, viral hook headline. MUST be extremely short, only 3 to 5 words maximum.",
					},
					virality_score: {
						type: "integer",
						description: "A score from 0 to 100 representing the viral potential of this clip. Highly viral clips should be 90+.",
					},
					description: {
						type: "string",
						description: "A short, engaging YouTube description for this clip."
					},
					tags: {
						type: "array",
						description: "An array of 5-10 relevant hashtags/keywords.",
						items: { type: "string" }
					},
					edits: {
						type: "array",
						description: "An array of editing commands that make up this clip. The total duration of all edits combined MUST equal duration_seconds. You CAN jump around in time (Non-Linear Editing). You can put a clip from 5:00 at the start as a hook, or trim out dead air between sentences.",
						items: {
							type: "object",
							properties: {
								source_start_sec: { type: "number", description: "CRITICAL: Must be in TOTAL SECONDS. (e.g. 10:21 is 621.0, NOT 1021.0). Do not just remove the colon." },
								source_end_sec: { type: "number", description: "CRITICAL: Must be in TOTAL SECONDS. (e.g. 10:21 is 621.0, NOT 1021.0). Do not just remove the colon." }
							},
							required: ["source_start_sec", "source_end_sec"]
						}
					},
				},
				required: [
					"clip_number",
					"start_time",
					"end_time",
					"duration_seconds",
					"title_or_hook",
					"virality_score",
					"description",
					"tags",
					"edits",
				],
			},
		},
	},
	required: ["recommended_shorts"],
};

export async function SummarizeUsingAI(fileUri, mimeType = "video/mp4", preferences = {}) {
	try {
		if (!fileUri) throw new Error("File URI is required");

		const isAudioMode = mimeType.startsWith("audio/");
		const category = preferences?.category || "podcast";

		// ── Category-specific editorial mindset ───────────────────────────────
		const categoryBlocks = {
			podcast: `
YOU ARE EDITING A PODCAST / INTERVIEW.
Think like a seasoned podcast clip editor. Your audience scrolls fast — you have 1.5 seconds to stop the thumb.
Editorial Mindset:
  - You are hunting for the ONE moment in this conversation that will make someone say "wait, what did he just say?" or "I need to send this to my friend."
  - The best podcast clips are NOT the whole interview — they are the 45-second bomb that makes the whole thing worth watching.
  - Listen for: controversial statements, personal confessions, shocking statistics, strong opinions, funny stories, or rapid-fire debates.
Camera Framing Decisions (think like a human editor):
  - Always use "fit_screen" to show the full context.`,

			gameplay: `
YOU ARE EDITING A GAMEPLAY / STREAMING VIDEO.
Think like a viral gaming clip editor. You want clips that make people go "HOW did he do that?" or "I can't stop laughing."
Editorial Mindset:
  - Hunt for: insane clutch moments, embarrassing fails, screaming reactions, unexpected plot twists in the game, or moments the streamer breaks character.
  - The game action and the streamer's face together make the best clips — the reaction without context is boring.
Camera Framing Decisions:
  - Always use "fit_screen" to show the game and streamer together.`,

			general: `
YOU ARE EDITING A GENERAL VIDEO.
Think like a content strategist. Find the moment with the highest shareability.
Camera Framing Decisions:
  - Always use "fit_screen".`
		};

		const categoryBlock = categoryBlocks[category] || categoryBlocks["general"];

		const prompt = `
You are a professional short-form video editor with 10 years of experience making viral content for TikTok, YouTube Shorts, and Instagram Reels. You have a sharp editorial eye and you think deeply before making any cut.

Your task: watch this video, think like a real editor, and produce a frame-accurate editing plan to extract 5 to 10 killer viral clips (or between 1 to 5 if the video is too short).

${categoryBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — WATCH AND FEEL THE VIDEO (Editor's instinct)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Watch the ENTIRE video from start to finish — do not skip anything. As you watch, think like a real editor:

  → What moment made you lean forward?
  → What moment would you screenshot and send to a friend?
  → What moment would make someone stop scrolling mid-video?
  → Where does the energy spike? Where does it drop off?
  → Which single sentence, if played in isolation, would make a stranger want to watch the full video?

Jot down (mentally) the timestamps and your gut reaction to each candidate moment. Be specific. A good editor knows exactly WHY a clip works — not just that it "seems interesting."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SELECT YOUR CLIPS (Editorial judgment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A great clip has three parts, like a story:
  HOOK     → The first 3 seconds must create instant curiosity, shock, controversy, or emotion.
  BUILD-UP → The middle must maintain tension, humor, or engagement. No dead air, no filler.
  PAYOFF   → The ending must deliver: a punchline, a revelation, a strong opinion, a conclusion. Never cut early.

TIMESTAMP ALIGNMENT:
  Your clip has an overall start_time and duration_seconds, but your edits can pull from anywhere.
  
  NON-LINEAR EDITING IS ALLOWED AND ENCOURAGED!
  You have full control over the final video timeline. The Python engine will stitch these edits in the EXACT order you provide them.
  
  Want to create a viral hook?
    Take a crazy 3-second moment from the middle of the video (e.g., source: 300.0 to 303.0).
    Make it the VERY FIRST item in your "edits" array.
    Then jump back to the context (e.g., source: 152.0 to 160.0).
  
  Want to trim dead air or a cough?
    Just leave a gap! e.g., edit 1: [152.0→155.0], edit 2: [157.0→160.0]. The 2 seconds of silence (155-157) are deleted!
  
  MATH CHECK:
  The sum of all (source_end_sec - source_start_sec) for every edit in your array MUST equal the clip's duration_seconds.

A clip FAILS if it:
  ✗ Opens with "Hi guys" or "So today" or "Welcome back" — this is death on short-form.
  ✗ Ends before the actual point is made — the viewer will feel cheated.
  ✗ Contains more than 2-3 seconds of silence or filler.
  ✗ Needs other context from the video to make sense on its own.
  ✗ Is shorter than 30 seconds or longer than 85 seconds.

Output EXACTLY 5 to 10 clips:
  - If the video is too short, you may output between 1 and 5 clips.
  - All clips must be on completely different topics and have a significant time gap between them in the video. Do not output two back-to-back clips or two thematically similar clips.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — BUILD THE EDIT TIMELINE (Non-Linear Editing Enabled!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Now build the "edits" array. This is your shot list — the exact frame-by-frame instructions your editing software will execute.

TIMESTAMP FORMAT (CRITICAL):
  All source_start_sec and source_end_sec values MUST BE IN TOTAL SECONDS.
  To convert MM:SS to seconds, you must multiply the minutes by 60 and add the seconds!
  For example, 10 minutes and 21 seconds (10:21) is 10 * 60 + 21 = 621.0 seconds. 
  NEVER just remove the colon (e.g., 10:21 is NOT 1021.0). 
  Use decimal precision (e.g., 621.450).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — FINAL REVIEW (Don't skip this)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before you write a single character of JSON, do this review in your head:

  [ ] Did I use non-linear editing effectively? (Hooks from the middle, trimming dead air)
  [ ] Sum of all edit durations == clip's duration_seconds?
  [ ] Did I place the most explosive moment first in the edits array?

  [ ] Is every clip between 30 and 85 seconds?
  [ ] Are my clips on different topics with a large time gap between them?
  [ ] Is my title_or_hook 3-5 words only?
  [ ] If the language is Hindi or Urdu: is title_or_hook in Roman script (English letters), not Devanagari or Arabic?

Only output the JSON after passing this review.

Output ONLY a raw valid JSON object. No markdown, no code fences, no explanation.
`;

		const userMessage = isAudioMode
			? "You are a professional audio clip editor. Listen to this entire audio recording from beginning to end — don't skip anything. Use your editorial instincts to identify the best 5 to 10 moments that would go viral as short-form content. Identify clear start and end timestamps for each clip segment based on what was SAID. If the audio is too short, provide between 1 and 5 clips instead. Before outputting, verify your timestamp math: the sum of your edits must exactly equal duration_seconds."
			: "You are a professional video editor. Watch this entire video from beginning to end — don't skip anything. Use your editorial instincts to identify the best 5 to 10 moments that would go viral as short-form content. If the video is too short, provide between 1 and 5 clips instead. Then build a precise, frame-accurate edit timeline for each clip. Before outputting, verify your timestamp math: the sum of your edits must exactly equal duration_seconds, and you should actively use Non-Linear Editing to jump-cut out boring pauses or reorder hooks.";

		// ── Retry loop for transient Gemini errors (503, 429) ─────────────────
		const MAX_RETRIES = 3;
		let lastError;
		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				const response = await ai.models.generateContent({
					model: "gemini-2.5-flash",
					contents: [
						{
							role: "user",
							parts: [
								{ fileData: { fileUri: fileUri, mimeType: mimeType } },
								{ text: userMessage },
							],
						},
					],
					config: {
						systemInstruction: prompt,
						responseMimeType: "application/json",
						responseSchema: summaryJsonSchema,
						thinkingConfig: { thinkingBudget: -1 },
					},
				});

				const text = response.text;
				console.log(text);
				return text;
			} catch (err) {
				lastError = err;
				const status = err?.status ?? err?.error?.code;
				const isRetryable = status === 503 || status === 429 || status === 500;

				if (isRetryable && attempt < MAX_RETRIES) {
					const backoffMs = Math.pow(2, attempt) * 5000; // 10s, 20s
					console.warn(`[SummarizeUsingAI] Gemini ${status} on attempt ${attempt}/${MAX_RETRIES}. Retrying in ${backoffMs / 1000}s...`);
					await new Promise(r => setTimeout(r, backoffMs));
				} else {
					// Non-retryable or out of retries
					break;
				}
			}
		}

		console.error("Gemini API Error (all retries exhausted):", lastError);
		throw lastError;
	} catch (error) {
		console.error("Gemini API Error:", error);
		throw error;
	}
}
