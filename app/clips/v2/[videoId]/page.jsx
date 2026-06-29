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
				body: JSON.stringify({ preferences }),
			});
			
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
			} else {
				setAlertVisible(true);
				setTimeout(() => setAlertVisible(false), 4000);
				targetPhase = "processing";
			}
		} catch (err) {
			console.error("Lambda call failed:", err);
		} finally {
			setLambdaLoading(false);
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

				if (data.status === "completed") {
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
		window.location.href = `${EDITOR_URL}/edit/${videoId}`;
	}

	return (
		<div className="min-h-screen bg-brand-background text-brand-on-surface font-sans flex">
			{/* ANIMATED TOAST ALERT (MATCHES DESIGN SYSTEM TOKENS) */}
			{alertVisible && (
				<div
					style={{ animation: "slideUp 0.35s ease-out forwards" }}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
				>
					<div className="flex items-center gap-3 bg-white border border-brand-border-subtle text-brand-on-surface px-5 py-3.5 rounded-lg shadow-xl whitespace-nowrap">
						<span className="w-2.5 h-2.5 bg-brand-vibrant-teal rounded-full animate-ping shrink-0" />
						<div>
							<p className="text-sm font-bold text-brand-on-surface tracking-tight">
								Processing Started
							</p>
							<p className="text-xs text-brand-on-surface-variant">
								Your video has been queued in the AI engine.
							</p>
						</div>
						<button
							onClick={() => setAlertVisible(false)}
							className="ml-4 text-brand-on-surface-variant hover:text-brand-on-surface text-xs"
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
			<aside className="w-64 bg-white border-r border-brand-border-subtle flex flex-col justify-between p-4 sticky top-0 h-screen z-10">
				<div>
					{/* Brand Identity Branding Header */}
					<div className="flex items-center gap-2 px-2 py-4 mb-4">
						<div className="bg-brand-primary p-2 rounded text-white flex items-center justify-center">
							<Film size={20} />
						</div>
						<div>
							<h1 className="font-bold text-lg leading-none flex items-center gap-1 text-brand-on-surface">
								ClipAI
							</h1>
							<span className="text-xs font-semibold text-brand-primary tracking-wider uppercase">
								Pro Plan
							</span>
						</div>
					</div>

					{/* Navigation Link Lists */}
					<nav className="space-y-1">
						{[
							{ name: "Dashboard", icon: LayoutDashboard },
							{ name: "My Projects", icon: FolderMinus },
							{ name: "Clips", icon: Film, active: true },
							{ name: "Assets", icon: Layers },
							{ name: "Settings", icon: Settings },
						].map((item) => {
							const Icon = item.icon;
							return (
								<button
									key={item.name}
									onClick={() =>
										item.name === "Dashboard" &&
										router.push("/dashboard")
									}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
										item.active
											? "bg-brand-primary text-white"
											: "text-brand-on-surface-variant hover:bg-brand-surfaceBg hover:text-brand-on-surface"
									}`}
								>
									<Icon size={18} />
									{item.name}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Footer Support Utilities inside Sidebar */}
				<div className="space-y-4">
					<div className="space-y-1 border-t border-brand-border-subtle pt-4">
						<button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-on-surface-variant hover:text-brand-on-surface">
							<HelpCircle size={18} /> Help
						</button>
						<button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-brand-on-surface-variant hover:text-brand-on-surface">
							<LifeBuoy size={18} /> Support
						</button>
					</div>

					<div className="bg-brand-surfaceBg border border-brand-border-subtle rounded-lg p-4">
						<h4 className="text-sm font-bold text-brand-on-surface mb-1">
							Upgrade to Enterprise
						</h4>
						<p className="text-xs text-brand-on-surface-variant mb-3 leading-relaxed">
							Unlock unlimited AI rendering pipeline rules and 4K
							exports.
						</p>
						<button className="w-full bg-brand-primary text-white font-medium py-2 px-3 rounded text-xs hover:bg-brand-primaryHover transition-colors">
							Upgrade Now
						</button>
					</div>
				</div>
			</aside>

			{/* MAIN LAYOUT WRAPPER PANELS */}
			<main className="flex-1 overflow-y-auto max-w-[1280px] mx-auto w-full px-12 py-8">
				{/* TOP STATUS HEADER BAR */}
				<header className="flex justify-between items-center mb-8 pb-4 border-b border-brand-border-subtle">
					<div className="flex items-center gap-3">
						<button
							onClick={() => router.back()}
							className="text-xs font-semibold text-brand-primary hover:underline font-mono"
						>
							← Back to Workspace
						</button>
						<span className="text-neutral-300">/</span>
						<h2 className="text-xl font-semibold tracking-tight">
							AI Clipping Factory
						</h2>
						<span
							className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border ${
								isProcessing
									? "bg-blue-50 text-brand-primary border-blue-200 animate-pulse"
									: phase === "done"
									? "bg-[#e2fbf4] text-brand-vibrant-teal border-[#b2f2e1]"
									: "bg-brand-surfaceBg text-brand-on-surface-variant border-brand-border-subtle"
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
								<p className="text-sm font-semibold text-brand-on-surface leading-none">
									Alex Rivera
								</p>
								<p className="text-xs text-brand-on-surface-variant">
									alex@clipai.io
								</p>
							</div>
							<img
								src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
								alt="Profile frame"
								className="w-10 h-10 rounded-full object-cover border border-brand-border-subtle"
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
							<h3 className="text-xl font-bold text-brand-on-surface mb-1">
								Review Workspace Asset
							</h3>
							<p className="text-sm text-brand-on-surface-variant font-mono">
								Asset Key Ref:{" "}
								<span className="text-brand-primary font-semibold">
									{videoId}
								</span>
							</p>
						</div>

						{/* Video preview workspace platform card */}
						<div className="bg-white border border-brand-border-subtle rounded-lg overflow-hidden shadow-sm">
							<div className="relative w-full bg-black aspect-video flex items-center justify-center">
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

							<div className="p-6 border-t border-brand-border-subtle bg-white">
								<div className="inline-flex items-center gap-1.5 text-brand-primary text-xs font-semibold bg-brand-surfaceBg px-2.5 py-1 rounded mb-4">
									<Sparkles
										size={14}
										className="text-brand-neon-purple animate-pulse"
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
													? "bg-slate-50 border-brand-primary/50"
													: "bg-[var(--surface-bg)] border-brand-border-subtle hover:bg-slate-50"
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
														? "bg-[var(--primary)] text-white"
														: "bg-[var(--border-subtle)] bg-white"
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
														? "text-brand-on-surface font-semibold"
														: "text-brand-on-surface-variant"
												}`}
											>
												{item.label}
											</span>
										</label>
									))}
								</div>

								{/* Start Processing Button (Matches Primary Dashboard Buttons) */}
								<button
									onClick={startProcessing}
									disabled={lambdaLoading}
									className={`w-full py-3 px-4 rounded font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 ${
										lambdaLoading
											? "bg-[var(--surface-bg)] text-brand-on-surface-variant cursor-not-allowed border border-brand-border-subtle"
											: "button text-white shadow-sm"
									}`}
								>
									{lambdaLoading ? (
										<>
											<Loader2
												size={16}
												className="animate-spin text-brand-primary"
											/>
											Submitting Pipeline Workspace
											Task...
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
            PHASE: PROCESSING + DONE — Pipeline UI Dashboard Grid
        ════════════════════════════════════════════════════════════ */}
				{(phase === "processing" || phase === "done") && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch animate-fadeIn">
						{/* ── Main Production Engine Panel ── */}
						<div className="lg:col-span-2 bg-white border border-brand-border-subtle rounded-lg p-6 flex flex-col justify-between min-h-[480px] shadow-sm">
							<div>
								<div className="flex items-center justify-between border-b border-brand-border-subtle pb-4 mb-6">
									<div>
										<h3 className="text-lg font-bold text-brand-on-surface flex items-center gap-2">
											{isProcessing && (
												<Loader2
													size={18}
													className="animate-spin text-brand-primary"
												/>
											)}
											{isProcessing
												? "AI Production Pipeline Active"
												: "✨ Content Highlights Ready"}
										</h3>
										<p className="text-xs text-brand-on-surface-variant font-mono mt-0.5">
											Target Ref ID: {videoId}
										</p>
									</div>
									<span className="text-xs font-mono bg-brand-surfaceBg border border-brand-border-subtle px-2.5 py-1 rounded text-brand-primary font-semibold">
										{isProcessing
											? `Stage ${currentStep + 1} of ${
													pipelineSteps.length
											  }`
											: "Completed"}
									</span>
								</div>

								{/* Animation screen/canvas window */}
								<div className="relative w-full h-64 bg-brand-surfaceBg rounded-lg border border-brand-border-subtle flex flex-col items-center justify-center overflow-hidden">
									{phase === "done" ? (
										<div className="text-center p-6 animate-fadeIn space-y-3">
											<div className="w-14 h-14 rounded-full bg-[#e2fbf4] text-brand-vibrant-teal border border-[#b2f2e1] flex items-center justify-center mx-auto text-xl">
												<CheckCircle2 size={28} />
											</div>
											<div>
												<p className="text-sm font-bold text-brand-on-surface">
													Composition Finalized
													Successfully
												</p>
												<p className="text-xs text-brand-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
													Webhook signature verified
													and matched. Your short-form
													vertical assets are split
													and ready.
												</p>
											</div>
										</div>
									) : (
										<div className="text-center space-y-3 animate-pulse">
											{pipelineSteps[currentStep] && (
												<>
													<div className="text-4xl bg-white w-16 h-16 rounded-lg border border-brand-border-subtle flex items-center justify-center mx-auto shadow-sm">
														{
															pipelineSteps[
																currentStep
															].icon
														}
													</div>
													<div className="text-xs font-bold font-mono text-brand-primary uppercase tracking-wider">
														{
															pipelineSteps[
																currentStep
															].statusText
														}
													</div>
												</>
											)}
										</div>
									)}
								</div>
							</div>

							{/* Active Step Progress Indicators Card */}
							{pipelineSteps[currentStep] && (
								<div className="mt-6 bg-brand-surfaceBg border border-brand-border-subtle rounded-lg p-4">
									<span className="text-[10px] font-bold text-brand-primary tracking-wider uppercase block mb-1">
										Active Objective Task
									</span>
									<h4 className="text-sm font-bold text-brand-on-surface">
										{pipelineSteps[currentStep].title}
									</h4>
									<p className="text-xs text-brand-on-surface-variant mt-0.5 leading-relaxed">
										{pipelineSteps[currentStep].desc}
									</p>

									{/* Step Progress Dots Tracking */}
									<div className="flex gap-1.5 mt-4">
										{pipelineSteps.map((_, i) => (
											<div
												key={i}
												className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
													i < currentStep
														? "bg-brand-vibrant-teal"
														: i === currentStep
														? "bg-brand-primary"
														: "bg-white border border-brand-border-subtle"
												}`}
											/>
										))}
									</div>
								</div>
							)}
						</div>

						{/* ── Console Ledger Shell Card ── */}
						<div className="bg-white border border-brand-border-subtle rounded-lg p-5 flex flex-col justify-between min-h-[480px] shadow-sm">
							<div className="flex flex-col flex-1">
								<div className="flex items-center justify-between mb-3 border-b border-brand-border-subtle pb-2">
									<h4 className="text-xs font-bold text-brand-on-surface-variant uppercase tracking-wider">
										System Console Logs
									</h4>
									{isProcessing && (
										<span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
									)}
								</div>

								{/* Simulated Log Output Window Container */}
								<div className="flex-1 bg-brand-surfaceBg border border-brand-border-subtle rounded-lg p-4 font-mono text-[11px] text-brand-on-surface-variant overflow-y-auto space-y-2 max-h-[340px]">
									{logs.length === 0 && (
										<p className="text-slate-400 italic">
											Awaiting secure pipeline handshake
											matrix output...
										</p>
									)}
									{logs.map((log, i) => {
										if (!log || typeof log !== "string")
											return null;

										let colorClass =
											"text-brand-on-surface-variant";
										if (log.startsWith("SUCCESS:"))
											colorClass =
												"text-brand-vibrant-teal font-semibold";
										if (log.startsWith("ERROR:"))
											colorClass =
												"text-red-500 font-semibold";

										return (
											<div
												key={i}
												className={`border-l-2 pl-2 border-slate-300 ${colorClass}`}
											>
												{log}
											</div>
										);
									})}
								</div>
							</div>

							{/* Form Actions Footer Panel */}
							<div className="mt-4 pt-3 border-t border-brand-border-subtle">
								<button
									disabled={isProcessing}
									onClick={handleViewGeneratedVideo}
									className={`w-full py-2.5 px-4 rounded font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
										isProcessing
											? "bg-brand-surfaceBg border border-brand-border-subtle text-brand-on-surface-variant cursor-not-allowed font-medium"
											: "bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold shadow-sm"
									}`}
								>
									{isProcessing ? (
										<>
											<Loader2
												size={12}
												className="animate-spin text-brand-primary"
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

				{/* FOOTER EXTERNAL REFERENCES */}
				<footer className="mt-16 pt-6 border-t border-brand-border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-brand-on-surface-variant">
					<div className="flex items-center gap-2">
						<span className="font-bold text-brand-primary">
							ClipAI
						</span>
						<span>© 2026 ClipAI Inc. All rights reserved.</span>
					</div>
					<div className="flex gap-6">
						<a
							href="#"
							className="hover:text-brand-on-surface transition-colors"
						>
							Privacy Policy
						</a>
						<a
							href="#"
							className="hover:text-brand-on-surface transition-colors"
						>
							Terms of Service
						</a>
						<a
							href="#"
							className="hover:text-brand-on-surface transition-colors"
						>
							Security Node
						</a>
					</div>
				</footer>
			</main>
		</div>
	);
}
