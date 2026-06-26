'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AIClipsPage({ params }) {
  const { videoId } = use(params);
  const router = useRouter();

  // ─── Phase control ───────────────────────────────────────────────────────────
  // 'preview'    → show video player + Start Processing button
  // 'processing' → show pipeline animations + console logs
  // 'done'       → show success state
  const [phase, setPhase] = useState('preview');

  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [lambdaLoading, setLambdaLoading] = useState(false);

  const intentionallyClosed = useRef(false);
  const logIntervalRef = useRef(null);
  const stepIntervalRef = useRef(null);
  const videoRef = useRef(null);

  const isProcessing = phase === 'processing';

  const pipelineSteps = [
    { title: 'Initializing S3 Workspace Pipeline',  desc: 'Verifying asset checksums and mapping handles.' },
    { title: 'AI Transcription Engine (Whisper)',    desc: 'Extracting clean audio channels and compiling text arrays.' },
    { title: 'Neural Scene & Face Detection',        desc: 'Analyzing frames for high-engagement indicators.' },
    { title: 'Dynamic Framing & Captions Render',   desc: 'Applying 9:16 cropping metrics and embedding subtitles.' },
  ];

  // ─── Lambda call ─────────────────────────────────────────────────────────────
  const startProcessing = async () => {
    setLambdaLoading(true);
    let targetPhase = null; // track intended phase
  
    try {
      const response = await fetch(`/api/video_processing/${videoId}`, {
        method: "POST",
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }
  
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
      // Set phase AFTER lambdaLoading is cleared, outside the batch ambiguity
      if (targetPhase === "done") {
        setPhase("done");
      } else if (targetPhase === "processing") {
        setTimeout(() => setPhase("processing"), 800);
      }
    }
  };

  // ─── SSE webhook listener (only active while processing) ─────────────────────
  useEffect(() => {
    if (!videoId || phase !== 'processing') return;

    intentionallyClosed.current = false;
    const eventSource = new EventSource(`/api/webhook/clips?id=${videoId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.status === 'completed') {
          setCurrentStep(pipelineSteps.length - 1);
        
          setLogs((prev) => [
            ...prev,
            'SUCCESS: Webhook broadcast matched!',
            'SUCCESS: Processing finalized.',
            'SUCCESS: Canvas ready.'
          ]);
        
          setPhase('done');
        
          intentionallyClosed.current = true;
          eventSource.close();
        } else if (data.status === 'FAILED') {
          setPhase('done');
          setLogs((prev) => [...prev, 'ERROR: External AI processing engine reported a structural failure.']);
          intentionallyClosed.current = true;
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse incoming stream data:', err);
      }
    };

    eventSource.onerror = () => {
      if (!intentionallyClosed.current) {
        console.log('SSE: Disconnected from event stream or waiting for server...');
      }
    };

    return () => {
      intentionallyClosed.current = true;
      eventSource.close();
    };
  }, [videoId, phase]);

  // ─── Step animation (passive visual while processing) ────────────────────────
  useEffect(() => {
    if (!isProcessing) return;

    stepIntervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < pipelineSteps.length - 2) return prev + 1;
        return prev;
      });
    }, 5000);

    return () => clearInterval(stepIntervalRef.current);
  }, [isProcessing]);

  // ─── Console log simulation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isProcessing) return;

    const mockSystemLogs = [
      'SYS: Initializing link node correlation matrix...',
      `SYS: Source media established payload hash lookup for asset [${videoId}]`,
      'AUDIO: Extracting payload frequency spectrum channels...',
      'WHISPER: Processing voice audio waveforms via deep layer matrices...',
      'VISION: High-density focal vectors matched between timestamp 0:12 - 0:45.',
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

  function handleViewGeneratedVideo(){
    router.push(`/clips/output/${videoId}`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 relative overflow-hidden">

      {/* ── Animated toast alert ── */}
      {alertVisible && (
        <div
          style={{ animation: 'slideUp 0.35s ease-out forwards' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 bg-neutral-900 border border-lime-500/40 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-lime-500/10 whitespace-nowrap">
            <span className="w-2.5 h-2.5 bg-lime-400 rounded-full animate-ping shrink-0" />
            <div>
              <p className="text-sm font-semibold text-lime-400 font-mono">Processing Started</p>
              <p className="text-xs text-neutral-400">Your video has been queued in the AI engine.</p>
            </div>
            <button
              onClick={() => setAlertVisible(false)}
              className="ml-4 text-neutral-500 hover:text-white text-xs"
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

      <div className="max-w-5xl mx-auto relative z-10">

        <button
          onClick={() => router.back()}
          className="text-neutral-400 hover:text-lime-400 text-xs font-mono mb-8 block transition-colors"
        >
          ← Return to Workspace Dashboard
        </button>

        {/* ════════════════════════════════════════════════════════════
            PHASE: PREVIEW — video player + start button
        ════════════════════════════════════════════════════════════ */}
        {phase === 'preview' && (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Review Your Video</h1>
              <p className="text-xs text-neutral-400 font-mono">
                Asset Ref: <span className="text-neutral-300">{videoId}</span>
              </p>
            </div>

            {/* Video player card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

              {/* Thumbnail / video */}
              <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                  poster={`/api/thumbnail/${videoId}`}   /* swap for your actual thumbnail URL */
                >
                  {/* Swap src for your actual signed S3 / CDN URL */}
                  <source src={`/api/video/${videoId}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Video meta + action */}
              <div className="p-5 border-t border-neutral-800">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Source Video</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Ready for AI clip extraction · Whisper · Scene detection · 9:16 reframe
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-md text-lime-400 font-mono">
                    READY
                  </span>
                </div>

                {/* Pipeline preview chips */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {pipelineSteps.map((step, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-lg"
                    >
                      {i + 1}. {step.title}
                    </span>
                  ))}
                </div>

                {/* Start button */}
                <button
                  onClick={startProcessing}
                  disabled={lambdaLoading}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm font-mono tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                    lambdaLoading
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-black shadow-lg shadow-lime-500/20'
                  }`}
                >
                  {lambdaLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                      Submitting to AI Engine...
                    </>
                  ) : (
                    '🚀 Start AI Processing'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PHASE: PROCESSING + DONE — pipeline UI
        ════════════════════════════════════════════════════════════ */}
        {(phase === 'processing' || phase === 'done') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

            {/* ── Main pipeline panel ── */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between min-h-[480px]">
              <div>
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
                  <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                      {isProcessing && (
                        <span className="inline-block w-2.5 h-2.5 bg-lime-500 rounded-full animate-ping" />
                      )}
                      {isProcessing ? 'AI Production Engine Active' : '✨ Clip Generation Finalized'}
                    </h1>
                    <p className="text-xs text-neutral-400">
                      Asset Ref: <span className="font-mono text-neutral-300">{videoId}</span>
                    </p>
                  </div>
                  <span className="text-[11px] bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-md text-lime-400 font-mono">
                    {isProcessing ? `Stage ${currentStep + 1} of ${pipelineSteps.length}` : 'Done'}
                  </span>
                </div>

                {/* Animation screen */}
                <div className="relative w-full h-64 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col items-center justify-center overflow-hidden">

                  {/* Subtle scan-line glow while processing */}
                  {isProcessing && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(163,230,53,0.015) 3px, rgba(163,230,53,0.015) 4px)',
                      }}
                    />
                  )}

                  {phase === 'done' ? (
                    <div className="text-center p-6 animate-fadeIn">
                      <div className="w-16 h-16 rounded-full bg-lime-500/10 border border-lime-500 text-lime-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                        ✓
                      </div>
                      <p className="text-sm font-semibold font-mono text-lime-400">
                        Composition Rendered Successfully
                      </p>
                      <p className="text-xs text-neutral-500 max-w-xs mt-1">
                        Webhook signature matches tracking hashes. Your clips have been split.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-neutral-400 animate-pulse space-y-2">
                      {currentStep === 0 && <><div className="text-2xl mb-2">📁</div><div>Ingesting Source Clusters...</div></>}
                      {currentStep === 1 && <><div className="text-2xl mb-2">🎵</div><div>Whisper NLP Decoding Pipeline...</div></>}
                      {currentStep === 2 && <><div className="text-2xl mb-2">🔍</div><div>Analyzing High-Engagement Focal Weights...</div></>}
                    </div>
                  )}
                </div>
              </div>

              {/* Active step card */}
              <div className="mt-6 bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <span className="text-[10px] text-lime-500 font-mono block mb-1">Active Objective Task</span>
                <h3 className="text-sm font-semibold text-neutral-200">{pipelineSteps[currentStep].title}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{pipelineSteps[currentStep].desc}</p>

                {/* Step progress dots */}
                <div className="flex gap-1.5 mt-3">
                  {pipelineSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-700 ${
                        i <= currentStep ? 'bg-lime-500' : 'bg-neutral-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Console log panel ── */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between min-h-[480px]">
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3 border-b border-neutral-800/60 pb-2">
                  <h2 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    System Console Logs
                  </h2>
                  {isProcessing && (
                    <span className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse" />
                  )}
                </div>

                <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-[11px] text-neutral-400 overflow-y-auto space-y-2 max-h-[360px]">
                  {logs.length === 0 && (
                    <p className="text-neutral-700 italic">Waiting for engine output...</p>
                  )}
                  {logs.map((log, i) => {
                    if (!log || typeof log !== 'string') return null;
                    const colorClass = log.startsWith('SUCCESS:')
                      ? 'text-lime-400 font-semibold'
                      : log.startsWith('ERROR:')
                      ? 'text-red-400 font-semibold'
                      : 'text-neutral-400';
                    return (
                      <div key={i} className={`border-l-2 pl-2 border-neutral-800 ${colorClass}`}>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/60">
                <button
                  disabled={isProcessing}
                  onClick={handleViewGeneratedVideo}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs font-mono tracking-wide transition-all duration-300 ${
                    isProcessing
                      ? 'bg-neutral-950 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                      : 'bg-lime-500 hover:bg-lime-400 text-black shadow-lg'
                  }`}
                >
                  {isProcessing
                    ? '⚡ Awaiting External Webhook Signal...'
                    : '🚀 View Generated Smart Clips'}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}