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
						const videoUrlToProcess = videoRow.gemini_file_uri;

						if (!videoUrlToProcess) {
							throw new Error("Gemini File URI is missing. Cannot process AWS URL directly via fileData.");
						}

						ai_response_raw = await SummarizeUsingAI(
							videoUrlToProcess,
							preferences
						);
					} catch (aiErr) {
						console.error("Gemini processing failed (possibly expired URI or missing URI):", aiErr);
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
						edits: clip.edits || [],
						// Dummy interval to prevent AWS Lambda from crashing with "list index out of range"
						face_detection_intervals: [
							{ start_sec: 0, end_sec: 9999, is_focus_a_face: true, focus_bounding_box: [0, 0, 1000, 1000] }
						]
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
					edits: {
						type: "array",
						description: "An array of editing commands (cuts, zooms, tracking) that make up this clip. The total duration of all edits combined should equal duration_seconds. These are sequential chunks of video.",
						items: {
							type: "object",
							properties: {
								source_start_sec: { type: "number", description: "Start second in the original video for this cut." },
								source_end_sec: { type: "number", description: "End second in the original video for this cut." },
								action: { type: "string", description: "The editing action to apply. Options: 'track_face', 'static_zoom', 'fit_screen'." },
								zoom_level: { type: "number", description: "Zoom multiplier. 1.0 is standard, 1.2 is zoomed in. Do not exceed 1.2." },
								speaker_bbox_hint: {
									type: "array",
									description: "If action is 'track_face', provide [ymin, xmin, ymax, xmax] 0-1000 scale.",
									items: { type: "number" }
								},
								target_center_x: { type: "number", description: "If action is 'static_zoom', center X coordinate (0.0 to 1.0)." },
								target_center_y: { type: "number", description: "If action is 'track_face' or 'static_zoom', center Y coordinate (0.0 to 1.0) indicating vertical position." },
								visual_effects: {
									type: "object",
									description: "Optional visual effects to apply to this clip chunk.",
									properties: {
										color_filter: { type: "string", description: "Color filter to apply. Options: 'none', 'grayscale', 'high_contrast', 'sepia'. Default is 'none'." }
									}
								}
							},
							required: ["source_start_sec", "source_end_sec", "action", "zoom_level"]
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
					"edits",
				],
			},
		},
	},
	required: ["recommended_shorts"],
};

export async function SummarizeUsingAI(videoUrl, preferences = {}) {
	try {
		if (!videoUrl) throw new Error("Video URL is required");

		const useFaceDetection = preferences?.faceDetection ?? true;
		const prioritize = preferences?.prioritize ?? false;
		const category = preferences?.category || "podcast";

		let categoryGuidelines = "";
		if (category === "podcast") {
			categoryGuidelines = `
--- PODCAST / INTERVIEW GUIDELINES ---
- Focus heavily on interesting conversations, hot takes, or funny moments.
- If it's a wide shot with 2 or more people in the frame interacting, you MUST use \`action: "fit_screen"\` so the audience can see everyone's reactions. Do NOT use \`track_face\` if multiple people are on screen together.
- If the camera cuts to a close-up of just 1 person speaking, use \`action: "track_face"\`.`;
		} else if (category === "gameplay") {
			categoryGuidelines = `
--- GAMEPLAY / STREAMING GUIDELINES ---
- Focus on high-action moments, funny fails, or extreme reactions.
- Use \`action: "fit_screen"\` for most of the gameplay to preserve the UI and game action.
- Only use \`action: "track_face"\` if there is a webcam face that takes up a large portion of the screen and is doing a crazy reaction.`;
		} else {
			categoryGuidelines = `
--- GENERAL VIDEO GUIDELINES ---
- Find the most engaging moments.
- If multiple people are in the frame, use \`action: "fit_screen"\` to keep them all visible.`;
		}

		const prompt = `
[SYSTEM DIRECTIVE: STRICT ENFORCEMENT MODE]
You are an elite AI Video Editor and Viral Content Strategist. Your primary directive is to extract hyper-viral, standalone short-form clips (TikTok, YouTube Shorts, Reels) from the provided video. 

The video category is: ${category.toUpperCase()}.
${categoryGuidelines}

FAILURE TO COMPLY WITH THE FOLLOWING STRICT RULES WILL RESULT IN TASK FAILURE.

--- CORE DIRECTIVES (NON-NEGOTIABLE) ---
1. FULL VIDEO DISTRIBUTION (CRITICAL): You MUST watch and process the ENTIRE video from start to finish.
2. INDEPENDENT TOPICS & CLIP COUNT (CRITICAL): 
   - You MUST generate EXACTLY 1 to 2 standalone viral clips from the video. Do not generate more than 2 clips.
   - Each clip MUST complete at least 1 full topic or thought from start to finish. If a topic takes 60 seconds to explain, output ONE 60-second clip. Do NOT chop it abruptly.
   - Clips CANNOT start exactly where the previous clip ended. Clips MUST be separated by significant time and context.
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
4. TIMELINE EDITING INSTRUCTIONS: \`edits\` MUST contain an array of editing commands that dictate the final video cut.
   - You can generate as many edits as needed to make the clip dynamic and perfectly timed.
   - Break the clip down into sequential chunks using \`source_start_sec\` and \`source_end_sec\` from the ORIGINAL video.
   - MILLISECOND PRECISION CUTS (CRITICAL): You MUST provide \`source_start_sec\` and \`source_end_sec\` with high decimal precision (e.g., 2.300, 5.401) to perfectly match camera cuts. DO NOT round to whole seconds if the camera cuts mid-second!
   - CUT ON ACTION: If a wide shot of multiple people is on screen from 2.300s to 5.400s, use \`action: "fit_screen"\` for that EXACT duration. If the video suddenly cuts to 1 person at 5.401s, immediately start a NEW edit chunk at 5.401s with \`action: "track_face"\` or \`"static_zoom"\`.
${useFaceDetection ? `   - EXTREMELY ACCURATE FACE TRACKING: If a single person is speaking and they are the ONLY important person on screen, use \`action: "track_face"\` and provide an EXTREMELY ACCURATE \`speaker_bbox_hint\` (0-1000 scale: [ymin, xmin, ymax, xmax]) for the MAIN CHARACTER.
   - VERTICAL CENTERING: When using \`track_face\`, you MUST also provide \`target_center_y\` (0.0 to 1.0 scale) indicating where the speaker's face is vertically in the original video.
   - CRITICAL ZOOMING: If there is only 1 main character visible, you MUST zoom in slightly on their face by setting a \`zoom_level\` of 1.1 to 1.2 to make it engaging. DO NOT EXCEED 1.2 as it will crop their head off!
   - FIT SCREEN FOR GROUPS (CRITICAL): If there are 2 OR MORE people in the current frame, you MUST NOT track a single face. You MUST use \`action: "fit_screen"\` to show the whole video instead of only 1 person. This ensures no one gets cut out during group conversations or podcasts.
   - If you want to show an object, reaction, or gameplay, use \`action: "static_zoom"\` and provide \`target_center_x\` and \`target_center_y\` (0.0 to 1.0 scale, e.g. 0.5 for middle).` : `   - NO FACE TRACKING: Face detection is disabled. You MUST NOT use \`action: "track_face"\`.
   - FIT SCREEN: You MUST use \`action: "fit_screen"\` to automatically shrink the wide 16:9 video and add a blurred background so the whole frame is visible in a 9:16 layout.
   - If you want to show an object or gameplay with a standard crop, you may use \`action: "static_zoom"\` and provide \`target_center_x\` and \`target_center_y\` (0.0 to 1.0 scale, e.g. 0.5 for middle) with a zoom_level of 1.0.`}
   - Use \`zoom_level\` dynamically for other actions. 1.0 is standard vertical crop.
   - LANGUAGE INSTRUCTION: If the video is spoken in Hindi or Urdu, you MUST write the \`title_or_hook\` strictly in Roman Hindi or Roman Urdu (written using English letters). NEVER use Devanagari or Arabic scripts.
   - VISUAL EFFECTS: You can set \`visual_effects.color_filter\` to "grayscale", "high_contrast", or "sepia" to emphasize emotional beats, flashbacks, or dramatic moments.
   - Analyze both the AUDIO and the VIDEO to figure out precisely who the MAIN CHARACTER/ACTION is for every cut.

RETURN ONLY THE RAW, VALID JSON DATA. DO NOT WRAP IN MARKDOWN OR EXPLANATORY TEXT.
`;

		const response = await ai.models.generateContent({
			// model: "gemini-2.5-pro",
			model: "gemini-2.5-flash",
			contents: [
				{
					role: "user",
					parts: [
						{ fileData: { fileUri: videoUrl, mimeType: "video/mp4" } },
						{ text: "You are an expert AI video editor and short-form content strategist. CRITICAL: You must actively listen to the audio and analyze the visual frames for the ENTIRE video from start to finish. Do not stop processing early." },
					],
				},
			],
			config: {
				systemInstruction: prompt, // your big prompt string
				responseMimeType: "application/json",
				responseSchema: summaryJsonSchema,
				// service tier: check current SDK config field name — see note below
			},
		});

		const text = response.text; // or response.candidates[0].content.parts[0].text depending on SDK version
		console.log(text);
		return text;
	} catch (error) {
		console.error("Gemini API Error:", error);
		throw error;
	}
}