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
				if (!creditsRes.ok) throw new Error("Failed to load user credits");

				const videoData = await videoRes.json();
				const creditsData = await creditsRes.json();

				if (!isMounted) return;

				setCreditsCost(videoData.creditsCost || 1);
				setUserBalance(creditsData.balance || 0);

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
	const [preferences, setPreferences] = useState({
		faceDetection: true,
		bRoll: false,
		soundEffects: false,
		vfx: false,
		useAI: true,
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
			},
		];

		if (preferences.useAI) {
			steps.push({
				title: "AI Transcription Engine (Whisper)",
				desc: "Extracting clean audio channels and compiling text arrays.",
				icon: "🎵",
				statusText: "Whisper NLP Decoding Pipeline...",
			});
		}

		if (preferences.faceDetection) {
			steps.push({
				title: "Neural Scene & Face Detection",
				desc: "Analyzing frames for high-engagement indicators.",
				icon: "🔍",
				statusText: "Analyzing High-Engagement Focal Weights...",
			});
		}

		if (preferences.bRoll) {
			steps.push({
				title: "Contextual B-Roll Insertion",
				desc: "Sourcing and stitching supplemental context layers.",
				icon: "🎞️",
				statusText: "Stitching Contextual B-Roll Layers...",
			});
		}

		if (preferences.soundEffects) {
			steps.push({
				title: "Audio Sound Effects Layering",
				desc: "Embedding automated ambient transitions and sound designs.",
				icon: "🔊",
				statusText: "Layering Dynamic Sound Effects...",
			});
		}

		if (preferences.vfx) {
			steps.push({
				title: "Dynamic Visual Effects (VFX) Render",
				desc: "Injecting custom motion assets and overlay enhancements.",
				icon: "✨",
				statusText: "Rendering Visual Effects Overlays...",
			});
		}

		steps.push({
			title: "Dynamic Framing & Captions Render",
			desc: "Applying 9:16 cropping metrics and embedding subtitles.",
			icon: "🎬",
			statusText: "Finalizing 9:16 Composition Render...",
		});

		return steps;
	}, [preferences]);

	// ─── Lambda call ─────────────────────────────────────────────────────────────
	const startProcessing = async () => {
		setLambdaLoading(true);
		let targetPhase = null;

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
		if (!videoId || phase !== "processing") return;

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

					intentionallyClosed.current = true;
					eventSource.close();
				} else if (data.status === "FAILED") {
					setPhase("done");
					setLogs((prev) => [
						...prev,
						"ERROR: External AI processing engine reported a structural failure.",
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
	}, [videoId, phase, pipelineSteps]);

	// ─── Step animation ──────────────────────────────────────────────────────────
	useEffect(() => {
		if (!isProcessing) return;

		stepIntervalRef.current = setInterval(() => {
			setCurrentStep((prev) => {
				if (prev < pipelineSteps.length - 1) return prev + 1;
				return prev;
			});
		}, 5000);

		return () => clearInterval(stepIntervalRef.current);
	}, [isProcessing, pipelineSteps]);

	// ─── Console log simulation ───────────────────────────────────────────────────
	useEffect(() => {
		if (!isProcessing) return;

		const mockSystemLogs = [
			"SYS: Initializing link node correlation matrix...",
			`SYS: Source media established payload hash lookup for asset [${videoId}]`,
			"AUDIO: Extracting payload frequency spectrum channels...",
			"WHISPER: Processing voice audio waveforms via deep layer matrices...",
			"VISION: High-density focal vectors matched between timestamp 0:12 - 0:45.",
		];

		let logIndex = 0;
		logIntervalRef.current = setInterval(() => {
			if (logIndex < mockSystemLogs.length) {
				setLogs((prev) => [...prev, mockSystemLogs[logIndex]]);
				logIndex++;
			} else {
				clearInterval(logIntervalRef.current);
			}
		}, 2000);

		return () => clearInterval(logIntervalRef.current);
	}, [isProcessing, videoId]);

	function handleViewGeneratedVideo() {
		window.location.href = `${EDITOR_URL}/editor/${videoId}`;
	}

	if (isInitialLoading) {
		return (
			<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "80vh" }}>
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-10 h-10 animate-spin text-[#7c3aed]" />
					<p className="text-[#a1a1aa] font-medium tracking-wide animate-pulse">
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
					<div className="flex items-center gap-3 bg-[#18181b] border border-[#27272a] text-[#fafafa] px-5 py-3.5 rounded-lg shadow-xl whitespace-nowrap">
						<span className="w-2.5 h-2.5 bg-[#4ade80] rounded-full animate-ping shrink-0" />
						<div>
							<p className="text-sm font-bold text-[#fafafa] tracking-tight">
								Processing Started
							</p>
							<p style={{ fontSize: 12, color: "#a1a1aa", margin: 0, marginTop: 4 }}>
								Your video has been queued in the AI engine.
							</p>
						</div>
						<button
							onClick={() => setAlertVisible(false)}
							className="ml-4 text-[#a1a1aa] hover:text-[#fafafa] text-xs"
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
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

			{/* SIDEBAR NAVIGATION PANEL (EXACT DESIGN MATCH) */}
			

			{/* MAIN LAYOUT WRAPPER PANELS */}
			<main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "32px 48px" }}>
				{/* TOP STATUS HEADER BAR */}
				<header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid #27272a" }}>
					<div className="flex items-center gap-3">
						<button
							onClick={() => router.back()}
							style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer" }}
						>
							← Back to Workspace
						</button>
						<span style={{ color: "#3f3f46" }}>/</span>
						<h2 style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", margin: 0, letterSpacing: "-0.03em" }}>
							AI Clipping Factory
						</h2>
						<span
							className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border ${
								isProcessing
									? "bg-[rgba(124,58,237,0.1)] text-[#a78bfa] border-[rgba(124,58,237,0.2)] animate-pulse"
									: phase === "done"
									? "bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[rgba(74,222,128,0.2)]"
									: "bg-[#18181b] text-[#a1a1aa] border-[#27272a]"
							}`}
						>
							{isProcessing
								? "Pipeline Live"
								: phase === "done"
								? "Ready"
								: "Staged Configuration"}
						</span>
					</div>

					<div className="flex items-center gap-6">
						<div className="flex items-center gap-3">
							<div className="text-right">
								<p style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", margin: 0 }}>
									Alex Rivera
								</p>
								<p className="text-xs text-[#a1a1aa]">
									alex@clipai.io
								</p>
							</div>
							<img
								src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
								alt="Profile frame"
								style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid #27272a" }}
							/>
						</div>
					</div>
				</header>

				{/* ════════════════════════════════════════════════════════════
            PHASE: PREVIEW — Setup & Checkboxes
        ════════════════════════════════════════════════════════════ */}
				{phase === "preview" && (
					<div className="max-w-3xl mx-auto space-y-6">
						<div>
							<h3 style={{ fontSize: 20, fontWeight: 800, color: "#fafafa", marginBottom: 4 }}>
								Review Workspace Asset
							</h3>
							<p style={{ fontSize: 14, color: "#a1a1aa", fontFamily: "monospace", margin: 0 }}>
								Asset Key Ref:{" "}
								<span style={{ color: "#a78bfa", fontWeight: 600 }}>
									{videoId}
								</span>
							</p>
						</div>

						{/* Video preview workspace platform card */}
						<div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
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

							<div style={{ padding: 24, borderTop: "1px solid #27272a", background: "#18181b" }}>
								<div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 12, fontWeight: 600, background: "rgba(124, 58, 237, 0.1)", padding: "4px 10px", borderRadius: 6, marginBottom: 16 }}>
									<Sparkles
										size={14}
										style={{ color: "#c4b5fd" }} className="animate-pulse"
									/>
									<span>
										Configure Workspace Automated Engine
										Layers
									</span>
								</div>

								{/* Interactive Checkbox Layout Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
									{[
										{
											id: "faceDetection",
											label: "Adding Face Detection",
										},
										{
											id: "bRoll",
											label: "Adding B-Roll Contextual Video Layers",
										},
										{
											id: "soundEffects",
											label: "Layering Dynamic Sound Effects",
										},
										{
											id: "vfx",
											label: "Injecting Motion VFX Assets",
										},
										{
											id: "useAI",
											label: "Utilize AI Transcription (Whisper NLP)",
										},
									].map((item) => (
										<label
											key={item.id}
											className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer select-none transition-colors group ${
												preferences[item.id]
													? "bg-[rgba(124,58,237,0.05)] border-[rgba(124,58,237,0.5)]"
													: "bg-[#18181b] border-[#27272a] hover:bg-[#27272a]"
											}`}
										>
											<input
												type="checkbox"
												checked={preferences[item.id]}
												onChange={(e) =>
													setPreferences((prev) => ({
														...prev,
														[item.id]:
															e.target.checked,
													}))
												}
												className="sr-only"
											/>
											<div
												className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
													preferences[item.id]
														? "bg-[#7c3aed] text-white"
														: "bg-[#27272a] bg-[#18181b]"
												}`}
											>
												{preferences[item.id] && (
													<svg
														className="w-3 h-3 text-white"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={4}
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M5 13l4 4L19 7"
														/>
													</svg>
												)}
											</div>
											<span
												className={`text-xs font-medium transition-colors ${
													preferences[item.id]
														? "text-[#fafafa] font-semibold"
														: "text-[#a1a1aa]"
												}`}
											>
												{item.label}
											</span>
										</label>
									))}
								</div>

								{/* Cost Display & Start Processing Button */}
								<div className="flex items-center justify-between mt-2 mb-3 px-1">
									<div className="flex items-center gap-2">
										<span className="text-[#a1a1aa] text-xs font-medium">Credits Required:</span>
										<span className="text-white text-sm font-bold bg-[#27272a] px-2 py-0.5 rounded border border-[#3f3f46]">
											{creditsCost !== null ? creditsCost : "-"}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-[#a1a1aa] text-xs font-medium">Your Balance:</span>
										<span className={`text-sm font-bold px-2 py-0.5 rounded border ${
											userBalance !== null && creditsCost !== null && userBalance < creditsCost
												? "text-red-400 bg-red-400/10 border-red-400/20"
												: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20"
										}`}>
											{userBalance !== null ? userBalance : "-"}
										</span>
									</div>
								</div>

								<button
									onClick={startProcessing}
									disabled={lambdaLoading || isInitialLoading || (userBalance !== null && creditsCost !== null && userBalance < creditsCost)}
									className={`w-full py-3 px-4 rounded font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 ${
										lambdaLoading || isInitialLoading || (userBalance !== null && creditsCost !== null && userBalance < creditsCost)
											? "bg-[var(--surface-bg)] text-[#a1a1aa] cursor-not-allowed border border-[#27272a]"
											: "bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg"
									}`}
								>
									{lambdaLoading || isInitialLoading ? (
										<>
											<Loader2
												size={16}
												className="animate-spin text-[#a78bfa]"
											/>
											{isInitialLoading ? "Verifying Video..." : "Submitting Pipeline Workspace Task..."}
										</>
									) : (userBalance !== null && creditsCost !== null && userBalance < creditsCost) ? (
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
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch animate-fadeIn">
						{/* ── Main Production Engine Panel ── */}
						<div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} className="lg:col-span-2">
							<div>
								<div className="flex items-center justify-between border-[rgba(74,222,128,0.2)] border-[#27272a] pb-4 mb-6">
									<div>
										<h3 className="text-lg font-bold text-[#fafafa] flex items-center gap-2">
											{isProcessing && (
												<Loader2
													size={18}
													className="animate-spin text-[#a78bfa]"
												/>
											)}
											{isProcessing
												? "AI Production Pipeline Active"
												: "✨ Content Highlights Ready"}
										</h3>
										<p className="text-xs text-[#a1a1aa] font-mono mt-0.5">
											Target Ref ID: {videoId}
										</p>
									</div>
									<span className="text-xs font-mono bg-[rgba(74,222,128,0.1)]rand-surfaceBg border border-[#27272a] px-2.5 py-1 rounded text-[#a78bfa] font-semibold">
										{isProcessing
											? `Stage ${currentStep + 1} of ${
													pipelineSteps.length
											  }`
											: "Completed"}
									</span>
								</div>

								{/* Animation screen/canvas window */}
								<div className="relative w-full h-64 bg-[rgba(74,222,128,0.1)]rand-surfaceBg rounded-lg border border-[#27272a] flex flex-col items-center justify-center overflow-hidden">
									<div className="text-center space-y-3 animate-pulse">
										{pipelineSteps[currentStep] && (
											<>
												<div className="text-4xl bg-[#27272a] w-16 h-16 rounded-xl border border-[#27272a] flex items-center justify-center mx-auto shadow-sm">
													{
														pipelineSteps[
															currentStep
														].icon
													}
												</div>
												<div className="text-xs font-bold font-mono text-[#a78bfa] uppercase tracking-wider">
													{
														pipelineSteps[
															currentStep
														].statusText
													}
												</div>
											</>
										)}
									</div>
								</div>
							</div>

							{/* Active Step Progress Indicators Card */}
							{pipelineSteps[currentStep] && (
								<div className="mt-6 bg-[rgba(74,222,128,0.1)]rand-surfaceBg border border-[#27272a] rounded-lg p-4">
									<span className="text-[10px] font-bold text-[#a78bfa] tracking-wider uppercase block mb-1">
										Active Objective Task
									</span>
									<h4 className="text-sm font-bold text-[#fafafa]">
										{pipelineSteps[currentStep].title}
									</h4>
									<p className="text-xs text-[#a1a1aa] mt-0.5 leading-relaxed">
										{pipelineSteps[currentStep].desc}
									</p>

									{/* Step Progress Dots Tracking */}
									<div className="flex gap-1.5 mt-4">
										{pipelineSteps.map((_, i) => (
											<div
												key={i}
												className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
													i < currentStep
														? "bg-[#4ade80]"
														: i === currentStep
														? "bg-[rgba(74,222,128,0.1)]rand-primary"
														: "bg-white border border-[#27272a]"
												}`}
											/>
										))}
									</div>
								</div>
							)}
						</div>

						{/* ── Console Ledger Shell Card ── */}
						<div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
							<div className="flex flex-col flex-1">
								<div className="flex items-center justify-between mb-3 border-[rgba(74,222,128,0.2)] border-[#27272a] pb-2">
									<h4 className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider">
										System Console Logs
									</h4>
									{isProcessing && (
										<span className="w-2 h-2 bg-[rgba(74,222,128,0.1)]rand-primary rounded-full animate-pulse" />
									)}
								</div>

								{/* Simulated Log Output Window Container */}
								<div className="flex-1 bg-[rgba(74,222,128,0.1)]rand-surfaceBg border border-[#27272a] rounded-lg p-4 font-mono text-[11px] text-[#a1a1aa] overflow-y-auto space-y-2 max-h-[340px]">
									{logs.length === 0 && (
										<p className="text-[#71717a] italic">
											Awaiting secure pipeline handshake
											matrix output...
										</p>
									)}
									{logs.map((log, i) => {
										if (!log || typeof log !== "string")
											return null;

										let colorClass =
											"text-[#a1a1aa]";
										if (log.startsWith("SUCCESS:"))
											colorClass =
												"text-[#4ade80] font-semibold";
										if (log.startsWith("ERROR:"))
											colorClass =
												"text-red-500 font-semibold";

										return (
											<div
												key={i}
												className={`border-l-2 pl-2 border-[#3f3f46] ${colorClass}`}
											>
												{log}
											</div>
										);
									})}
								</div>
							</div>

							{/* Form Actions Footer Panel */}
							<div className="mt-4 pt-3 border-t border-[#27272a]">
								<button
									disabled={isProcessing}
									onClick={handleViewGeneratedVideo}
									className={`w-full py-2.5 px-4 rounded font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
										isProcessing
											? "bg-[rgba(74,222,128,0.1)]rand-surfaceBg border border-[#27272a] text-[#a1a1aa] cursor-not-allowed font-medium"
											: "bg-[rgba(74,222,128,0.1)]rand-primary hover:bg-[rgba(74,222,128,0.1)]rand-primaryHover text-white font-semibold shadow-sm"
									}`}
								>
									{isProcessing ? (
										<>
											<Loader2
												size={12}
												className="animate-spin text-[#a78bfa]"
											/>
											Awaiting Cluster Webhook Broadcast
											Signal...
										</>
									) : (
										<>
											<span className="button w-100 py-3 rounded-[5px]">
												View Generated Smart Clips
											</span>
											<ArrowRight size={14} />
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}

				{phase === "done" && (
					<div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
						<div className="flex justify-between items-center bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
							<div>
								<h3 className="text-white font-bold text-sm">Want different clips?</h3>
								<p className="text-[#a1a1aa] text-xs mt-1">You can re-run the AI analysis to discover new segments.</p>
							</div>
							<button
								onClick={() => {
									setPhase("preview");
									setAiAnalysis(null);
									setIsRegenerating(true);
								}}
								className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
									<path d="M3 3v5h5"/>
								</svg>
								Regenerate Clips
							</button>
						</div>
						<GeneratedClipPreview videoId={videoId} aiAnalysis={aiAnalysis} />
					</div>
				)}

				{/* FOOTER EXTERNAL REFERENCES */}
				<footer className="mt-16 pt-6 border-t border-[#27272a] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#a1a1aa]">
					<div className="flex items-center gap-2">
						<span className="font-bold text-[#a78bfa]">
							ClipAI
						</span>
						<span>© 2026 ClipAI Inc. All rights reserved.</span>
					</div>
					<div className="flex gap-6">
						<a
							href="#"
							className="hover:text-[#fafafa] transition-colors"
						>
							Privacy Policy
						</a>
						<a
							href="#"
							className="hover:text-[#fafafa] transition-colors"
						>
							Terms of Service
						</a>
						<a
							href="#"
							className="hover:text-[#fafafa] transition-colors"
						>
							Security Node
						</a>
					</div>
				</footer>
			</main>
		</div>
	);
}
