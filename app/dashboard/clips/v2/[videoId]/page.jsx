"use client";

import React, { use, useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	LayoutDashboard,
	FolderMinus,
	Film,
	Layers,
	Settings,
	HelpCircle,
	LifeBuoy,
	Bell,
	Sparkles,
	ArrowRight,
	Loader2,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import GeneratedClipPreview from "./GeneratedClipPreview";

export default function AIClipsPage({ params }) {
	const { videoId } = use(params);
	const router = useRouter();

	const EDITOR_URL = process.env.NEXT_PUBLIC_EDITOR_URL;
	// ─── Phase control ───────────────────────────────────────────────────────────
	// 'preview'    → show video player + checkboxes + Start Processing button
	// 'processing' → show pipeline animations + console logs
	// 'done'       → show success state
	const [phase, setPhase] = useState("preview");

	const [currentStep, setCurrentStep] = useState(0);
	const [logs, setLogs] = useState([]);
	const [alertVisible, setAlertVisible] = useState(false);
	const [lambdaLoading, setLambdaLoading] = useState(false);

	// ─── Credits & Preload State ────────────────────────────────────────────────
	const [creditsCost, setCreditsCost] = useState(null);
	const [userBalance, setUserBalance] = useState(null);
	const [isInitialLoading, setIsInitialLoading] = useState(true);
	const [aiAnalysis, setAiAnalysis] = useState(null);
	const [isRegenerating, setIsRegenerating] = useState(false);

	useEffect(() => {
		let isMounted = true;
		async function loadInitialData() {
			try {
				const [videoRes, creditsRes] = await Promise.all([
					fetch(`/api/video_processing/${videoId}`),
					fetch(`/api/credits`)
				]);

				if (!videoRes.ok) throw new Error("Failed to load video status");

				let creditsData = {};
				if (creditsRes.ok) {
					creditsData = await creditsRes.json();
				} else {
					console.warn("Failed to load user credits, proceeding anyway");
				}

				const videoData = await videoRes.json();

				if (!isMounted) return;

				setCreditsCost(videoData.creditsCost || 1);
				setUserBalance(creditsData.balance ?? null);
				setVideoDuration(videoData.duration || 60);

				if (videoData.status === 'completed') {
					if (videoData.ai_analysis) {
						try {
							const parsed = typeof videoData.ai_analysis === 'string' ? JSON.parse(videoData.ai_analysis) : videoData.ai_analysis;
							setAiAnalysis(parsed);
						} catch (e) {
							console.error("Failed to parse ai_analysis", e);
						}
					}
					setPhase('done');
				} else if (videoData.status === 'processing') {
					setPhase('processing');
				}
			} catch (err) {
				console.error("Initial load error:", err);
			} finally {
				if (isMounted) setIsInitialLoading(false);
			}
		}

		loadInitialData();
		return () => { isMounted = false; };
	}, [videoId]);

	// ─── Features Configuration State ───────────────────────────────────────────
	const [hoveredOption, setHoveredOption] = useState(null);
	const [videoDuration, setVideoDuration] = useState(60);
	const [preferences, setPreferences] = useState({
		category: "podcast",
		faceDetection: true,
		backgroundBlur: true,
		soundEffects: false,
		vfx: false,
		useAI: true,
		prioritize: false,
	});

	const intentionallyClosed = useRef(false);
	const logIntervalRef = useRef(null);
	const stepIntervalRef = useRef(null);
	const videoRef = useRef(null);

	const isProcessing = phase === "processing";

	// ─── Dynamically Formulated Pipeline Steps Based On Checkboxes ───────────────
	const pipelineSteps = useMemo(() => {
		const steps = [
			{
				title: "Initializing S3 Workspace Pipeline",
				desc: "Verifying asset checksums and mapping handles.",
				icon: "📁",
				statusText: "Ingesting Source Clusters...",
				weight: 5,
			},
		];

		if (preferences.useAI) {
			steps.push({
				title: "AI Transcription Engine (Whisper)",
				desc: "Extracting clean audio channels and compiling text arrays.",
				icon: "🎵",
				statusText: "Whisper NLP Decoding Pipeline...",
				weight: 30,
			});
		}

		if (preferences.faceDetection) {
			steps.push({
				title: "Neural Scene & Face Detection",
				desc: "Analyzing frames for high-engagement indicators.",
				icon: "🔍",
				statusText: "Analyzing High-Engagement Focal Weights...",
				weight: 20,
			});
		}

		if (preferences.backgroundBlur) {
			steps.push({
				title: "Background Blur Compositing",
				desc: "Rendering cinematic blurred letterboxing for wide frames.",
				icon: "🎞️",
				statusText: "Applying Cinematic Blur...",
				weight: 10,
			});
		}

		if (preferences.soundEffects) {
			steps.push({
				title: "Audio Sound Effects Layering",
				desc: "Embedding automated ambient transitions and sound designs.",
				icon: "🔊",
				statusText: "Layering Dynamic Sound Effects...",
				weight: 10,
			});
		}

		if (preferences.vfx) {
			steps.push({
				title: "Dynamic Visual Effects (VFX) Render",
				desc: "Injecting custom motion assets and overlay enhancements.",
				icon: "✨",
				statusText: "Rendering Visual Effects Overlays...",
				weight: 15,
			});
		}

		steps.push({
			title: "Dynamic Framing & Captions Render",
			desc: "Applying 9:16 cropping metrics and embedding subtitles.",
			icon: "🎬",
			statusText: "Finalizing 9:16 Composition Render...",
			weight: 10,
		});

		return steps;
	}, [preferences]);

	// Toggle this to switch between the real backend API pipeline vs local UI demo mode
	const USE_REAL_PIPELINE = false;

	// ─── Lambda call ─────────────────────────────────────────────────────────────
	const startProcessing = async () => {
		if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
			Notification.requestPermission();
		}

		setLambdaLoading(true);
		let targetPhase = null;

		if (!USE_REAL_PIPELINE) {
			setTimeout(() => {
				setAlertVisible(true);
				setTimeout(() => setAlertVisible(false), 4000);
				setPhase("processing");
				setLambdaLoading(false);

				// Calculate demo duration using the same algorithm
				const totalEstimatedMs = (videoDuration || 60) * 0.1 * 1000;

				// Simulate completion slightly after the animation finishes
				setTimeout(() => {
					setPhase("done");
					setCurrentStep(pipelineSteps.length - 1);
					if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
						new Notification("Your Shorts are Ready! 🎉", {
							body: "The AI Production Pipeline has finished generating your clips.",
						});
					}
				}, totalEstimatedMs + 4000);
			}, 1000);
			return;
		}

		try {
			const response = await fetch(`/api/video_processing/${videoId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ preferences, regenerate: isRegenerating }),
			});

			if (response.status === 402) {
				const data = await response.json();
				alert(data.error || "Insufficient credits.");
				return;
			}

			if (!response.ok) {
				throw new Error(response.error || "Something went wrong");
			}

			const data = await response.json();

			if (data.videoStatus === "exist") {
				setCurrentStep(pipelineSteps.length - 1);
				setLogs([
					"SUCCESS: Video has already been processed.",
					"SUCCESS: Opening completed project.",
				]);
				targetPhase = "done";

				// Re-fetch balance just in case it was a UI mismatch
				fetch(`/api/credits`).then(res => res.json()).then(d => setUserBalance(d.balance)).catch(console.error);
			} else {
				setAlertVisible(true);
				setTimeout(() => setAlertVisible(false), 4000);
				targetPhase = "processing";

				// Optimistically deduct balance
				if (userBalance !== null && creditsCost !== null) {
					setUserBalance(userBalance - creditsCost);
				}
			}
		} catch (err) {
			console.error("Lambda call failed:", err);
		} finally {
			setLambdaLoading(false);
			setIsRegenerating(false); // Reset regeneration state after request finishes
			if (targetPhase === "done") {
				setPhase("done");
			} else if (targetPhase === "processing") {
				setTimeout(() => setPhase("processing"), 800);
			}
		}
	};

	// ─── SSE webhook listener ───────────────────────────────────────────────────
	useEffect(() => {
		if (!USE_REAL_PIPELINE || !videoId || phase !== "processing") return;

		intentionallyClosed.current = false;
		const eventSource = new EventSource(`/api/webhook/clips?id=${videoId}`);

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.status?.toUpperCase() === 'COMPLETED') {
					if (data.ai_analysis) {
						const parsed = typeof data.ai_analysis === 'string' ? JSON.parse(data.ai_analysis) : data.ai_analysis;
						setAiAnalysis(parsed);
					} else {
						// If webhook doesn't include ai_analysis, we can fetch it again here
						// For now, rely on initial fetch or a secondary fetch if needed
						fetch(`/api/video_processing/${videoId}`).then(r => r.json()).then(d => {
							if (d.ai_analysis) {
								const parsed = typeof d.ai_analysis === 'string' ? JSON.parse(d.ai_analysis) : d.ai_analysis;
								setAiAnalysis(parsed);
							}
						});
					}
					setCurrentStep(pipelineSteps.length - 1);

					setLogs((prev) => [
						...prev,
						"SUCCESS: Webhook broadcast matched!",
						"SUCCESS: Processing finalized.",
						"SUCCESS: Canvas ready.",
					]);

					setPhase("done");
					if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
						new Notification("Your Shorts are Ready! 🎉", {
							body: "The AI Production Pipeline has finished generating your clips.",
						});
					}

					intentionallyClosed.current = true;
					eventSource.close();
				} else if (data.status === "FAILED") {
					setPhase("done");
					setLogs((prev) => [
						...prev,
						`ERROR: ${data.error || "External AI processing engine reported a structural failure."}`,
					]);
					intentionallyClosed.current = true;
					eventSource.close();
				}
			} catch (err) {
				console.error("Failed to parse incoming stream data:", err);
			}
		};

		eventSource.onerror = () => {
			if (!intentionallyClosed.current) {
				console.log(
					"SSE: Disconnected from event stream or waiting for server..."
				);
			}
		};

		return () => {
			intentionallyClosed.current = true;
			eventSource.close();
		};
	}, [videoId, phase, pipelineSteps.length]);

	// ─── Step animation ──────────────────────────────────────────────────────────
	useEffect(() => {
		if (!isProcessing) return;

		let timeoutId;
		const totalEstimatedMs = (videoDuration || 60) * 0.1 * 1000;
		const totalWeight = pipelineSteps.reduce((acc, step) => acc + (step.weight || 10), 0);

		const advanceStep = (stepIndex) => {
			if (stepIndex >= pipelineSteps.length - 1) {
				// Reached the final step. Wait indefinitely for the actual webhook or demo to trigger completion.
				return;
			}
			
			const currentStepObj = pipelineSteps[stepIndex];
			const stepDurationMs = ((currentStepObj.weight || 10) / totalWeight) * totalEstimatedMs;
			
			timeoutId = setTimeout(() => {
				setCurrentStep(stepIndex + 1);
			}, Math.max(2000, stepDurationMs));
		};

		advanceStep(currentStep);

		return () => clearTimeout(timeoutId);
	}, [isProcessing, currentStep, pipelineSteps.length, videoDuration]);

	// ─── Console log simulation ───────────────────────────────────────────────────
	useEffect(() => {
		if (!isProcessing) return;

		let isActive = true;

		const generateRealisticLogs = async () => {
			const steps = [
				{ text: "🤖 Waking up the AI robot...", delay: 500 },
				{ text: "📺 Looking at your video to see what's inside!", delay: 1200 },
				{ text: "📏 Checking the size and quality of the video...", delay: 800 },
				{ text: "🎧 Listening carefully to the audio track...", delay: 1500 },
				{ text: "🧠 Getting ready to understand the spoken words...", delay: 2000 },
				{ text: "📝 Writing down all the words... 14% done", delay: 800 },
				{ text: "📝 Writing down all the words... 45% done", delay: 800 },
				{ text: "📝 Writing down all the words... 89% done", delay: 800 },
				{ text: "✅ Finished listening! Found 42 cool sentences.", delay: 1000 },
				{ text: "👀 Looking for faces so nobody gets left out of the frame...", delay: 2500 },
				{ text: "🎯 Found the main person! Keeping them right in the middle.", delay: 800 },
				{ text: "✂️ Cutting the video into a perfect shape for phones...", delay: 2000 },
				{ text: "🎨 Painting the background to make it look super cinematic...", delay: 1500 },
				{ text: "🎬 Putting all the pieces together into a final masterpiece...", delay: 3000 },
				{ text: "🚀 All done! Saving your awesome video!", delay: 1500 },
			];

			for (const step of steps) {
				if (!isActive) break;
				await new Promise((r) => setTimeout(r, step.delay));
				if (!isActive) break;
				setLogs((prev) => [...prev, step.text]);
			}
		};

		generateRealisticLogs();

		return () => {
			isActive = false;
		};
	}, [isProcessing, videoId]);

	function handleViewGeneratedVideo() {
		window.location.href = `${EDITOR_URL}/editor/${videoId}`;
	}

	if (isInitialLoading) {
		return (
			<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "80vh" }}>
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-10 h-10 animate-spin text-[#0F2347]" />
					<p className="text-[#4b5563] font-medium tracking-wide animate-pulse">
						Initializing AI Workspace...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
			{/* ANIMATED TOAST ALERT (MATCHES DESIGN SYSTEM TOKENS) */}
			{alertVisible && (
				<div
					style={{ animation: "slideUp 0.35s ease-out forwards" }}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
				>
					<div className="flex items-center gap-3 bg-[#ffffff] border border-[#e5e7eb] text-[#0F2347] px-5 py-3.5 rounded-lg shadow-xl whitespace-nowrap">
						<span className="w-2.5 h-2.5 bg-[#4ade80] rounded-full animate-ping shrink-0" />
						<div>
							<p className="text-sm font-bold text-[#0F2347] tracking-tight">
								Processing Started
							</p>
							<p style={{ fontSize: 12, color: "#4b5563", margin: 0, marginTop: 4 }}>
								Your video has been queued in the AI engine.
							</p>
						</div>
						<button
							onClick={() => setAlertVisible(false)}
							className="ml-4 text-[#4b5563] hover:text-[#0F2347] text-xs"
						>
							✕
						</button>
					</div>
				</div>
			)}

			<style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes walkRight {
          0% { transform: translateX(-40px); }
          50% { transform: translateX(40px); }
          100% { transform: translateX(-40px); }
        }
        @keyframes trackRight {
          0% { transform: translateX(-40px); }
          50% { transform: translateX(40px); }
          100% { transform: translateX(-40px); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .walk-right { animation: walkRight 4s ease-in-out infinite; }
        .track-right { animation: trackRight 4s ease-in-out infinite; }
      `}</style>

			{/* SIDEBAR NAVIGATION PANEL (EXACT DESIGN MATCH) */}


			{/* MAIN LAYOUT WRAPPER PANELS */}
			<main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "32px 48px" }}>
				{/* TOP STATUS HEADER BAR REMOVED PER USER REQUEST */}

				{/* ════════════════════════════════════════════════════════════
            PHASE: PREVIEW — Setup & Checkboxes
        ════════════════════════════════════════════════════════════ */}
				{phase === "preview" && (
					<div className="max-w-3xl mx-auto space-y-6">
						<div>
							<h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F2347", marginBottom: 4 }}>
								Review Workspace Asset
							</h3>
							<p style={{ fontSize: 14, color: "#4b5563", fontFamily: "monospace", margin: 0 }}>
								Asset Key Ref:{" "}
								<span style={{ color: "#00C0D4", fontWeight: 600 }}>
									{videoId}
								</span>
							</p>
						</div>

						{/* Video preview workspace platform card */}
						<div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
							<div className="relative w-full bg-[rgba(74,222,128,0.1)]lack aspect-video flex items-center justify-center">
								<video
									ref={videoRef}
									className="w-full h-full max-h-[60vh]"
									controls
									preload="metadata"
									poster={`/api/thumbnail/${videoId}`}
								>
									<source
										src={`/api/video/${videoId}`}
										type="video/mp4"
									/>
									Your browser does not support the video tag.
								</video>
							</div>

							<div style={{ padding: 24, borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
								<div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#00C0D4", fontSize: 12, fontWeight: 600, background: "rgba(0, 192, 212, 0.1)", padding: "4px 10px", borderRadius: 6, marginBottom: 16 }}>
									<Sparkles
										size={14}
										style={{ color: "#00C0D4" }} className="animate-pulse"
									/>
									<span>
										Configure Workspace Automated Engine
										Layers
									</span>
								</div>



								{/* Interactive Checkbox Layout Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 items-start">
									{[
										{
											id: "faceDetection",
											label: "AI Face Tracking",
											desc: "Keeps speaker centered in 9:16 frame.",
										},
										{
											id: "backgroundBlur",
											label: "Cinematic Letterboxing",
											desc: "Blurs the wide background for group shots.",
										},
										// commented out other options
										// { id: "soundEffects", label: "Layering Dynamic Sound Effects" },
										// { id: "vfx", label: "Injecting Motion VFX Assets" },
										// { id: "useAI", label: "Utilize AI Transcription (Whisper NLP)" },
									].map((item) => (
										<div key={item.id} className="relative flex flex-col gap-2">
											<label
												className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer select-none transition-colors group relative z-10 ${preferences[item.id]
														? "bg-[rgba(124,58,237,0.05)] border-[rgba(124,58,237,0.5)]"
														: "bg-[#ffffff] border-[#e5e7eb] hover:bg-[#e5e7eb]"
													}`}
											>
												<input
													type="checkbox"
													checked={preferences[item.id]}
													onChange={(e) =>
														setPreferences((prev) => ({
															...prev,
															[item.id]: e.target.checked,
														}))
													}
													className="sr-only"
												/>
												<div
													className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center transition-all shrink-0 ${preferences[item.id]
															? "bg-[#0F2347] text-white border-[#0F2347]"
															: "border-[#d1d5db] bg-[#ffffff]"
														}`}
												>
													{preferences[item.id] && (
														<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
															<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
														</svg>
													)}
												</div>
												<div className="flex flex-col">
													<span
														className={`text-xs transition-colors ${preferences[item.id]
																? "text-[#0F2347] font-bold"
																: "text-[#4b5563] font-medium"
															}`}
													>
														{item.label}
													</span>
													<span className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">{item.desc}</span>
												</div>
												<div className="flex-1" />
												<div 
													className="w-5 h-5 rounded-full border border-[#d1d5db] bg-[#e5e7eb] flex items-center justify-center text-[#4b5563] hover:text-white hover:border-[#0F2347] transition-colors shrink-0 relative"
													onMouseEnter={() => setHoveredOption(item.id)}
													onMouseLeave={() => setHoveredOption(null)}
												>
													<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
														<path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>

													{/* Floating Absolute Hint Popover */}
													{hoveredOption === item.id && (
														<div className="absolute bottom-[calc(100%+12px)] right-0 md:-right-4 w-[280px] bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-3 animate-fadeIn shadow-2xl pointer-events-none z-50 text-left">
															{item.id === 'faceDetection' && (
																<>
																	<div className="w-full h-[120px] bg-[#f9fafb] rounded flex items-center justify-center relative overflow-hidden border border-[#e5e7eb] mb-3">
																		<div className="w-6 h-6 rounded-full bg-[#9ca3af] absolute top-[30px] left-[100px] walk-right" />
																		<div className="w-12 h-12 rounded-t-lg bg-[#9ca3af] absolute top-[58px] left-[88px] walk-right" />
																		<div className="absolute top-0 bottom-0 w-[67px] border-2 border-white/20 bg-white/5 track-right" style={{ left: '50%', marginLeft: '-33px' }} />
																	</div>
																	<h4 className="text-sm font-semibold text-[#0F2347] mb-1">Face Tracking Preview</h4>
																	<p className="text-xs text-[#4b5563] leading-relaxed normal-case">
																		Maintains subject focus by dynamically cropping the video to keep the speaker centered.
																	</p>
																</>
															)}
															{item.id === 'backgroundBlur' && (
																<>
																	<div className="w-full h-[120px] bg-[#f9fafb] rounded flex items-center justify-center relative overflow-hidden border border-[#e5e7eb] mb-3">
																		<div className="w-[67px] h-[120px] bg-black border-x border-[#e5e7eb] relative flex items-center justify-center overflow-hidden">
																			<div className="absolute inset-0 bg-blue-500/20 blur-[6px] scale-125" />
																			<div className="w-full h-[38px] bg-[#d1d5db] relative z-10 border-y border-[#9ca3af]" />
																		</div>
																	</div>
																	<h4 className="text-sm font-semibold text-[#0F2347] mb-1">Letterboxing Preview</h4>
																	<p className="text-xs text-[#4b5563] leading-relaxed normal-case">
																		Fills the empty space of wide videos with a cinematic blurred background.
																	</p>
																</>
															)}
															
															{/* Tooltip caret (triangle) pointing down */}
															<div className="absolute -bottom-1.5 right-2 md:right-5 w-3 h-3 bg-[#ffffff] border-b border-r border-[#e5e7eb] transform rotate-45" />
														</div>
													)}
												</div>
											</label>
										</div>
									))}
								</div>

								{/* Premium Prioritize Option */}
								<div className="mb-6">
									<label
										className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer select-none transition-all group relative overflow-hidden ${preferences.prioritize
												? "bg-gradient-to-r from-[rgba(245,158,11,0.1)] to-[rgba(217,119,6,0.1)] border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)]"
												: "bg-[#ffffff] border-[#e5e7eb] hover:bg-[#e5e7eb] hover:border-[#d1d5db]"
											}`}
									>
										{preferences.prioritize && (
											<div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.1)] to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
										)}
										<input
											type="checkbox"
											checked={preferences.prioritize}
											onChange={(e) =>
												setPreferences((prev) => ({
													...prev,
													prioritize: e.target.checked,
												}))
											}
											className="sr-only"
										/>
										<div
											className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all shrink-0 relative z-10 ${preferences.prioritize
													? "bg-[#f59e0b] border-[#f59e0b] text-[#ffffff]"
													: "bg-[#e5e7eb] border-[#d1d5db]"
												}`}
										>
											{preferences.prioritize && (
												<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											)}
										</div>
										<div className="flex-1 relative z-10">
											<div className="flex flex-wrap items-center gap-2">
												<span className={`text-sm font-bold transition-colors ${preferences.prioritize ? "text-[#f59e0b]" : "text-[#0F2347]"
													}`}>
													⚡ Prioritize AI Processing (Fast Mode)
												</span>
												<span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)]">
													+2 Credits
												</span>
											</div>
											<p className="text-xs text-[#4b5563] mt-1 leading-relaxed">
												Jump the queue and use the advanced Gemini Standard tier for ultra-fast, high-precision clipping results.
											</p>
										</div>
									</label>
								</div>

								{/* Cost Display & Start Processing Button */}
								<div className="flex items-center justify-between mt-2 mb-3 px-1">
									<div className="flex items-center gap-2">
										<span className="text-[#4b5563] text-xs font-medium">Credits Required:</span>
										<span className="text-[#0F2347] text-sm font-bold bg-[#e5e7eb] px-2 py-0.5 rounded border border-[#d1d5db]">
											{creditsCost !== null ? creditsCost + (preferences.prioritize ? 2 : 0) : "-"}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-[#4b5563] text-xs font-medium">Your Balance:</span>
										<span className={`text-sm font-bold px-2 py-0.5 rounded border ${userBalance !== null && creditsCost !== null && userBalance < (creditsCost + (preferences.prioritize ? 2 : 0))
												? "text-red-400 bg-red-400/10 border-red-400/20"
												: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20"
											}`}>
											{userBalance !== null ? userBalance : "-"}
										</span>
									</div>
								</div>

								<button
									onClick={startProcessing}
									disabled={lambdaLoading || isInitialLoading || (userBalance !== null && creditsCost !== null && userBalance < (creditsCost + (preferences.prioritize ? 2 : 0)))}
									className={`w-full py-3 px-4 rounded font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 ${lambdaLoading || isInitialLoading || (userBalance !== null && creditsCost !== null && userBalance < (creditsCost + (preferences.prioritize ? 2 : 0)))
											? "bg-[#f3f4f6] text-[#4b5563] cursor-not-allowed border border-[#e5e7eb]"
											: "bg-[#0F2347] hover:bg-[#1e3a8a] text-white shadow-lg"
										}`}
								>
									{lambdaLoading || isInitialLoading ? (
										<>
											<Loader2
												size={16}
												className="animate-spin text-[#00C0D4]"
											/>
											{isInitialLoading ? "Verifying Video..." : "Submitting Pipeline Workspace Task..."}
										</>
									) : (userBalance !== null && creditsCost !== null && userBalance < (creditsCost + (preferences.prioritize ? 2 : 0))) ? (
										<>
											<AlertCircle size={16} className="text-red-400" />
											Insufficient Credits
										</>
									) : (
										<>
											<Sparkles size={16} />
											Confirm & Start AI Processing
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ════════════════════════════════════════════════════════════
            PHASE: PROCESSING — Pipeline UI Dashboard Grid
        ════════════════════════════════════════════════════════════ */}
				{phase === "processing" && (
					<div className="grid grid-cols-1 gap-8 items-stretch animate-fadeIn">
						{/* ── Main Production Engine Panel ── */}
						<div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} className="lg:col-span-2">
							<div>
								<div className="flex items-center justify-between border-[rgba(74,222,128,0.2)] border-[#e5e7eb] pb-4 mb-6">
									<div>
										<h3 className="text-lg font-bold text-[#0F2347] flex items-center gap-2">
											{isProcessing && (
												<Loader2
													size={18}
													className="animate-spin text-[#00C0D4]"
												/>
											)}
											{isProcessing
												? "AI Production Pipeline Active"
												: "✨ Content Highlights Ready"}
										</h3>
										<p className="text-xs text-[#4b5563] font-mono mt-0.5">
											Target Ref ID: {videoId}
										</p>
										{isProcessing && (
											<div className="mt-3 inline-flex items-center gap-2 bg-[#0F2347]/5 border border-[#0F2347]/10 text-[#0F2347] px-3 py-2 rounded-lg text-xs font-semibold">
												<span className="animate-pulse">⏳</span>
												This process can take up to 5 minutes. We will notify you when your shorts are done!
											</div>
										)}
									</div>
									<span className="text-xs font-mono bg-[#f9fafb] border border-[#e5e7eb] px-2.5 py-1 rounded text-[#00C0D4] font-semibold">
										{isProcessing
											? `Stage ${currentStep + 1} of ${pipelineSteps.length
											}`
											: "Completed"}
									</span>
								</div>

								{/* n8n-style Workflow Canvas (Snake Layout) */}
								<div className="relative w-full flex-1 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] overflow-hidden" style={{ backgroundImage: "radial-gradient(#d1d5db 2px, transparent 2px)", backgroundSize: "24px 24px" }}>
									<div className="grid grid-cols-3 gap-y-16 gap-x-12 w-full max-w-5xl mx-auto py-16 relative z-10 px-8">
										{pipelineSteps.map((step, i) => {
											const row = Math.floor(i / 3);
											const isEvenRow = row % 2 === 0;
											const col = isEvenRow ? (i % 3) : 2 - (i % 3);
											
											return (
												<div key={i} className="relative flex flex-col w-full bg-white border-2 rounded-xl p-5 transition-all duration-500" 
													 style={{ gridColumn: col + 1, gridRow: row + 1, zIndex: 20 }}>
													
													{/* Background state overlay */}
													<div className={`absolute inset-0 rounded-xl transition-colors duration-500 z-0 ${
														i < currentStep ? 'bg-[#4ade80]/5' :
														i === currentStep ? 'bg-[#00C0D4]/5 shadow-[0_8px_30px_rgba(0,192,212,0.2)]' :
														'bg-transparent'
													}`} />

													{/* Dynamic Border state */}
													<div className={`absolute inset-0 rounded-xl border-2 transition-all duration-500 pointer-events-none z-10 ${
														i < currentStep ? 'border-[#4ade80]' :
														i === currentStep ? 'border-[#00C0D4]' :
														'border-[#e5e7eb] opacity-60'
													}`} />

													<div className="relative z-20">
														<div className="flex items-center gap-3 mb-3">
															<div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors ${
																i < currentStep ? 'bg-[#4ade80]/10 text-[#4ade80]' :
																i === currentStep ? 'bg-[#00C0D4]/10 text-[#00C0D4]' :
																'bg-[#f3f4f6] text-[#9ca3af]'
															}`}>
																{i === currentStep ? (
																	<Loader2 className="w-6 h-6 animate-spin text-[#00C0D4]" />
																) : (
																	step.icon
																)}
															</div>
															<div className="flex flex-col">
																<span className={`text-[10px] uppercase tracking-wider font-bold ${
																	i < currentStep ? 'text-[#4ade80]' :
																	i === currentStep ? 'text-[#00C0D4]' :
																	'text-[#9ca3af]'
																}`}>
																	{i < currentStep ? '✓ Completed' : i === currentStep ? '⚙️ Processing' : '⏳ Pending'}
																</span>
																<span className="text-xs font-bold text-[#0F2347]">
																	Node {i + 1}
																</span>
															</div>
														</div>
														<h4 className="text-sm font-bold text-[#0F2347] leading-tight mb-1">{step.title}</h4>
														<p className="text-xs text-[#6b7280] leading-snug line-clamp-2">{step.desc}</p>
													</div>

													{/* Horizontal Connection Wires */}
													{i % 3 !== 2 && i < pipelineSteps.length - 1 && (
														<div className={`absolute top-1/2 -translate-y-1/2 z-0 ${
															isEvenRow ? 'left-[100%]' : 'right-[100%]'
														} ${
															i < currentStep ? 'bg-[#4ade80] h-1.5 w-[3rem]' :
															'border-t-2 border-dashed border-[#d1d5db] h-0 w-[3rem] bg-transparent'
														}`}></div>
													)}

													{/* Vertical Drop Connection Wires */}
													{i % 3 === 2 && i < pipelineSteps.length - 1 && (
														<div className={`absolute top-[100%] left-1/2 -translate-x-1/2 z-0 ${
															i < currentStep ? 'bg-[#4ade80] w-1.5 h-[4rem]' :
															'border-l-2 border-dashed border-[#d1d5db] w-0 h-[4rem] bg-transparent'
														}`}></div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>


					</div>
				)}

				{phase === "done" && (
					<div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
						<div className="flex justify-between items-center bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl">
							<div>
								<h3 className="text-[#0F2347] font-bold text-sm">Want different clips?</h3>
								<p className="text-[#4b5563] text-xs mt-1">You can re-run the AI analysis to discover new segments.</p>
							</div>
							<button
								onClick={() => {
									setPhase("preview");
									setAiAnalysis(null);
									setIsRegenerating(true);
								}}
								className="bg-[#0F2347] hover:bg-[#0a1830] border border-[#0F2347] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
									<path d="M3 3v5h5" />
								</svg>
								Generate more clips
							</button>
						</div>
						<GeneratedClipPreview videoId={videoId} aiAnalysis={aiAnalysis} />
					</div>
				)}

				{/* FOOTER EXTERNAL REFERENCES */}
				<footer className="mt-16 pt-6 border-t border-[#e5e7eb] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#4b5563]">
					<div className="flex items-center gap-2">
						<span className="font-bold text-[#00C0D4]">
							ClipAI
						</span>
						<span>© 2026 ClipAI Inc. All rights reserved.</span>
					</div>
					<div className="flex gap-6">
						<a
							href="#"
							className="hover:text-[#0F2347] transition-colors"
						>
							Privacy Policy
						</a>
						<a
							href="#"
							className="hover:text-[#0F2347] transition-colors"
						>
							Terms of Service
						</a>
						<a
							href="#"
							className="hover:text-[#0F2347] transition-colors"
						>
							Security Node
						</a>
					</div>
				</footer>
			</main>
		</div>
	);
}
