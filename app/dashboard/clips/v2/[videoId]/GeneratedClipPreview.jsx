"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { parseMedia } from "@remotion/media-parser";
import { VideoComposition } from "../../../../components/VideoComposition";
import { parseSubtitleString } from "../../../../utils/parseSubtitles";
import { CAPTION_THEMES, PLATFORMS } from "../../../../components/CaptionEditor";

const INDIGO = "#6366f1";

const DEFAULT_SUBTITLES = `[00:00:00] Was being in prison kind of fun? Um, fun?
[00:00:07] No, I wouldn't say fun. Like, what was kind of cool about it,
[00:00:12] I've always wanted to go to jail. You know, there's this old saying
[00:00:17] that you don't go to jail to make friends. And I made some lifelong friends.`;

export default function GeneratedClipPreview({ videoId, aiAnalysis }) {
  const router = useRouter();

  const [subtitleInput, setSubtitleInput] = useState("");
  const [words, setWords] = useState([]);
  const [activeTheme, setActiveTheme] = useState("classic");
  const [animationOverride, setAnimationOverride] = useState("theme");
  const [fontSize, setFontSize] = useState(56);
  const [verticalPosition, setVerticalPosition] = useState(80);
  const [bgMusicVolume, setBgMusicVolume] = useState(20);
  const [hookEnabled, setHookEnabled] = useState(false);
  const [hookText, setHookText] = useState("WAIT FOR IT...");
  const [hookDurationSecs, setHookDurationSecs] = useState(3);
  const [hookFontSize, setHookFontSize] = useState(72);
  const [hookFontColor, setHookFontColor] = useState("#fbbf24");
  const [hookVerticalPosition, setHookVerticalPosition] = useState(20);

  const [brolls, setBrolls] = useState([]);
  const [bgMusicSrc, setBgMusicSrc] = useState("");
  const [hookMemeSrc, setHookMemeSrc] = useState("");
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoMeta, setVideoMeta] = useState(null);

  const [activeClipIndex, setActiveClipIndex] = useState(0);

  const videoSrc = `/api/video/output/${videoId}?index=${activeClipIndex}`;
  const recommendedShorts = aiAnalysis?.recommended_shorts || [];

  useEffect(() => {
    parseMedia({
      src: videoSrc,
      fields: { durationInSeconds: true, fps: true },
      acknowledgeRemotionLicense: true
    })
      .then((meta) => {
        setVideoMeta({
          durationInSeconds: meta.durationInSeconds,
          fps: meta.fps,
        });
      })
      .catch((err) => {
        console.error("Failed to parse video metadata:", err);
      });
  }, [videoSrc]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prefsRes, subsRes] = await Promise.all([
          fetch('/api/preferences'),
          fetch(`/api/video/subtitles/v2/${videoId}`)
        ]);

        if (prefsRes.ok) {
          const { preferences: p } = await prefsRes.json();
          if (p) {
            if (p.active_theme) setActiveTheme(p.active_theme);
            if (p.animation_override) setAnimationOverride(p.animation_override);
            if (p.font_size != null) setFontSize(p.font_size);
            if (p.vertical_position != null) setVerticalPosition(p.vertical_position);
            if (p.bg_music_volume != null) setBgMusicVolume(p.bg_music_volume);
            if (p.hook_enabled != null) setHookEnabled(p.hook_enabled);
            if (p.hook_text) setHookText(p.hook_text);
            if (p.hook_duration_secs != null) setHookDurationSecs(p.hook_duration_secs);
            if (p.hook_font_size != null) setHookFontSize(p.hook_font_size);
            if (p.hook_font_color) setHookFontColor(p.hook_font_color);
            if (p.hook_vertical_position != null) setHookVerticalPosition(p.hook_vertical_position);
          }
        }

        if (subsRes.ok) {
          const data = await subsRes.json();
          if (data.subtitles) setSubtitleInput(data.subtitles);
          else setSubtitleInput(DEFAULT_SUBTITLES);
          if (data.words) setWords(data.words);
        } else {
          setSubtitleInput(DEFAULT_SUBTITLES);
        }
      } catch (e) {
        console.error("Error loading preview data", e);
        setSubtitleInput(DEFAULT_SUBTITLES);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, [videoId]);

  const captions = useMemo(() => parseSubtitleString(subtitleInput), [subtitleInput]);
  const durationMs = captions.length > 0 ? captions[captions.length - 1].endMs : 10000;
  
  const fps = videoMeta?.fps ?? 30;
  const baseDurationFrames = (videoMeta && videoMeta.durationInSeconds && fps)
    ? Math.ceil(videoMeta.durationInSeconds * fps)
    : (Math.ceil((durationMs / 1000) * fps) || 450);
    
  const hookDurationFrames = (hookEnabled && hookMemeSrc) ? Math.ceil(hookDurationSecs * fps) : 0;
  const durationInFrames = baseDurationFrames + hookDurationFrames;

  const inputProps = useMemo(() => {
    const themeObj = { ...CAPTION_THEMES[activeTheme] };
    if (animationOverride !== "theme") {
      themeObj.animation = animationOverride;
    }
    return {
      videoUrl: videoSrc,
      fontSize,
      fontFamily: "Arial, sans-serif",
      verticalPosition,
      captions,
      theme: themeObj,
      words,
      overlays: [],
      brolls,
      bgMusicSrc,
      bgMusicVolume,
      hook: hookEnabled ? {
        text: hookText,
        durationSecs: hookDurationSecs,
        fontSize: hookFontSize,
        fontColor: hookFontColor,
        verticalPosition: hookVerticalPosition,
        memeSrc: hookMemeSrc
      } : null
    };
  }, [videoSrc, fontSize, verticalPosition, captions, words, activeTheme, animationOverride, brolls, bgMusicSrc, bgMusicVolume, hookEnabled, hookText, hookDurationSecs, hookFontSize, hookFontColor, hookVerticalPosition, hookMemeSrc]);

  // -- Post Modal Logic --
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [postStage, setPostStage] = useState(null);
  const [postProgress, setPostProgress] = useState(0);
  const [postError, setPostError] = useState(null);

  const [downloadStage, setDownloadStage] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => {
      if (prev.some(p => p.id === platform.id)) {
        return prev.filter(p => p.id !== platform.id);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleConfirmPost = async () => {
    if (selectedPlatforms.length === 0) return;
    setShowPlatformModal(false);
    setPostError(null);

    setPostStage('uploading');
    setPostProgress(0);
    await new Promise(resolve => {
      let p = 0;
      const t = setInterval(() => {
        p += Math.random() * 8 + 4;
        if (p >= 60) { p = 60; clearInterval(t); resolve(); }
        setPostProgress(Math.round(p));
      }, 180);
    });

    setPostStage('processing');
    await new Promise(resolve => {
      let p = 60;
      const t = setInterval(() => {
        p += Math.random() * 4 + 2;
        if (p >= 90) { p = 90; clearInterval(t); resolve(); }
        setPostProgress(Math.round(p));
      }, 220);
    });

    setPostProgress(95);
    try {
      const response = await fetch("/api/export/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputProps,
          videoId,
          durationInFrames,
          fps,
          targetPlatforms: selectedPlatforms.map(p => p.name),
          scheduledFor: scheduleDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start post job");

      setPostProgress(100);
      setPostStage('done');

      await new Promise(r => setTimeout(r, 900));
      router.push("/dashboard/v2/calendar");
    } catch (err) {
      console.error("[handleConfirmPost]", err);
      setPostStage(null);
      setPostProgress(0);
      setPostError(err.message);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64 text-[#a1a1aa] font-mono text-xs animate-pulse">
        Initializing player context...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pt-4 animate-fadeIn">
      {/* MULTI-CLIP SELECTOR */}
      {recommendedShorts.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 max-w-full">
          {recommendedShorts.map((clip, idx) => (
            <button
              key={idx}
              onClick={() => setActiveClipIndex(idx)}
              className={`flex-shrink-0 flex flex-col p-4 rounded-xl border text-left transition-all ${
                activeClipIndex === idx 
                  ? 'bg-[rgba(99,102,241,0.1)] border-[#6366f1]' 
                  : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]'
              }`}
              style={{ width: 280 }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[#a1a1aa]">Clip {idx + 1}</span>
                {clip.virality_score != null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${clip.virality_score >= 85 ? 'text-[#4ade80] bg-[rgba(74,222,128,0.1)]' : clip.virality_score >= 70 ? 'text-[#fbbf24] bg-[rgba(251,191,36,0.1)]' : 'text-[#a1a1aa] bg-[#27272a]'}`}>
                    Score: {clip.virality_score}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-[#fafafa] mb-1 line-clamp-2 leading-tight">
                {clip.title_or_hook || `Generated Clip ${idx + 1}`}
              </h4>
              <p className="text-xs text-[#a1a1aa] line-clamp-2 mt-auto">
                {clip.duration_seconds}s • {clip.rationale}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* PLAYER CONTAINER */}
      <div style={{
        height: "calc(60vh)", minHeight: 400, aspectRatio: "9 / 16", margin: "0 auto", borderRadius: 12, overflow: "hidden",
        boxShadow: `0 0 0 1px #27272a, 0 24px 64px rgba(0,0,0,0.8)`,
        position: "relative", background: "#000"
      }}>
        <Player
          component={VideoComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames || 300}
          fps={fps || 30}
          compositionHeight={1920}
          compositionWidth={1080}
          style={{ width: "100%", height: "100%" }}
          controls
          acknowledgeRemotionLicense
        />
      </div>

      {/* ACTIONS CONTAINER */}
      <div className="max-w-md mx-auto w-full flex flex-col gap-3">
        <button
          onClick={() => { setPostError(null); setShowPlatformModal(true); }}
          disabled={!!postStage}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px 16px", borderRadius: 10, border: "none",
            background: postStage
              ? "rgba(99,102,241,0.25)"
              : `linear-gradient(135deg, #7c3aed, ${INDIGO})`,
            color: "#ffffff", fontSize: 14, fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            cursor: postStage ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: postStage ? "none" : "0 4px 24px rgba(124,58,237,0.4)",
            letterSpacing: "-0.01em",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Post Video Now
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              setPostError(null);
              setDownloadStage('rendering');
              setDownloadProgress(0);

              try {
                // Start render job
                const response = await fetch("/api/export/post", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...inputProps,
                    videoId,
                    durationInFrames,
                    fps,
                    downloadOnly: true,
                  }),
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to start download render");
                
                const { renderId, bucketName } = data;
                
                // Poll for progress
                const pollInterval = setInterval(async () => {
                  try {
                    const progRes = await fetch(`/api/export/progress?renderId=${renderId}&bucketName=${bucketName}`);
                    const progData = await progRes.json();
                    
                    if (progData.done) {
                      clearInterval(pollInterval);
                      setDownloadProgress(100);
                      setDownloadStage('done');
                      
                      // Trigger download via fetch to catch HTTP errors (like 403 Forbidden)
                      try {
                        const dlRes = await fetch(progData.outUrl);
                        if (!dlRes.ok) {
                          throw new Error(`Failed to download: ${dlRes.status} ${dlRes.statusText}`);
                        }
                        const blob = await dlRes.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `clip-${videoId}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (dlError) {
                        console.error("Blob download failed, falling back to new tab", dlError);
                        window.open(progData.outUrl, "_blank");
                      }
                      
                      setTimeout(() => setDownloadStage(null), 2000);
                    } else if (progData.fatalErrorEncountered) {
                      clearInterval(pollInterval);
                      throw new Error("Rendering failed on server.");
                    } else {
                      setDownloadProgress(Math.round(progData.overallProgress * 100));
                    }
                  } catch (e) {
                    clearInterval(pollInterval);
                    setDownloadStage(null);
                    setPostError("Failed to fetch render progress: " + e.message);
                  }
                }, 2000);

              } catch (e) {
                console.error("Failed to render download", e);
                setDownloadStage(null);
                setPostError(e.message);
              }
            }}
            disabled={!!postStage || !!downloadStage}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 10, border: "1px solid #3f3f46",
              background: "#18181b", color: "#fafafa", fontSize: 14, fontWeight: 600,
              cursor: postStage || downloadStage ? "not-allowed" : "pointer", transition: "all 0.2s ease",
              opacity: postStage || downloadStage ? 0.5 : 1
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
          
          <button
            onClick={() => router.push(`/editor/${videoId}?index=${activeClipIndex}`)}
            disabled={!!postStage || !!downloadStage}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 10, border: "1px solid #3f3f46",
              background: "#18181b", color: "#fafafa", fontSize: 14, fontWeight: 600,
              cursor: postStage || downloadStage ? "not-allowed" : "pointer", transition: "all 0.2s ease",
              opacity: postStage || downloadStage ? 0.5 : 1
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Clip
          </button>
        </div>

        {postError && (
          <p style={{
            fontSize: 11, color: "#f87171",
            textAlign: "center", margin: "8px 0 0",
            background: "rgba(239,68,68,0.08)",
            padding: "8px", borderRadius: 6,
          }}>
            ✕ {postError}
          </p>
        )}
      </div>

      {/* PLATFORM PICKER MODAL */}
      {showPlatformModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 20,
            padding: "32px 28px",
            width: 460,
            maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.03em" }}>
                  Where to post?
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#71717a" }}>
                  Choose the platform to publish your video
                </p>
              </div>
              <button
                onClick={() => { setShowPlatformModal(false); setSelectedPlatforms([]); setScheduleDate(""); }}
                style={{
                  background: "#27272a", border: "1px solid #3f3f46",
                  borderRadius: 8, width: 32, height: 32,
                  color: "#a1a1aa", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Platform cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.some(p => p.id === platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform)}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                      background: isSelected ? platform.bg : "#09090b",
                      border: `1.5px solid ${isSelected ? platform.border : "#27272a"}`,
                      color: isSelected ? platform.color : "#a1a1aa",
                      textAlign: "left", transition: "all 0.15s ease",
                      boxShadow: isSelected ? `0 0 0 1px ${platform.border}, 0 4px 16px ${platform.glow}` : "none",
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: isSelected ? `${platform.color}18` : "#18181b",
                      border: `1px solid ${isSelected ? platform.border : "#27272a"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isSelected ? platform.color : "#52525b",
                      transition: "all 0.15s ease",
                    }}>
                      {platform.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? "#fafafa" : "#d4d4d8" }}>
                        {platform.name}
                      </div>
                      <div style={{ fontSize: 12, color: isSelected ? "#a1a1aa" : "#52525b", marginTop: 2 }}>
                        {platform.description}
                      </div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${isSelected ? platform.color : "#3f3f46"}`,
                      background: isSelected ? platform.color : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scheduler */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#d4d4d8", marginBottom: 8 }}>
                Schedule Post (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10,
                  background: "#09090b", border: "1px solid #3f3f46",
                  color: "#fafafa", fontSize: 14, fontFamily: "'Inter', sans-serif",
                  outline: "none", colorScheme: "dark"
                }}
              />
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmPost}
              disabled={selectedPlatforms.length === 0}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: selectedPlatforms.length > 0
                  ? (selectedPlatforms.length === 1 ? `linear-gradient(135deg, ${selectedPlatforms[0].color}, ${selectedPlatforms[0].color}bb)` : `linear-gradient(135deg, #7c3aed, ${INDIGO})`)
                  : "#27272a",
                color: selectedPlatforms.length > 0 ? "#fff" : "#52525b",
                fontSize: 14, fontWeight: 700, cursor: selectedPlatforms.length > 0 ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: selectedPlatforms.length > 0 ? (selectedPlatforms.length === 1 ? `0 4px 20px ${selectedPlatforms[0].glow}` : `0 4px 20px rgba(124,58,237,0.4)`) : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {selectedPlatforms.length > 0 ? (scheduleDate ? `Schedule for ${selectedPlatforms.length} platform(s)` : `Post to ${selectedPlatforms.length} platform(s)`) : "Select a platform"}
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD SIMULATION OVERLAY */}
      {postStage && selectedPlatforms.length > 0 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 28,
          animation: "fadeIn 0.2s ease",
        }}>
          {/* Platform badge(s) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: -8 }}>
              {selectedPlatforms.map((plat, idx) => (
                <div key={plat.id} style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${plat.color}18`,
                  border: `1.5px solid ${plat.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: plat.color,
                  boxShadow: `0 0 24px ${plat.glow}`,
                  marginLeft: idx > 0 ? -16 : 0,
                  zIndex: 10 - idx
                }}>
                  {plat.icon}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: selectedPlatforms.length === 1 ? selectedPlatforms[0].color : "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {selectedPlatforms.map(p => p.name).join(", ")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.03em" }}>
                {postStage === 'uploading' && 'Uploading video...'}
                {postStage === 'processing' && 'Processing & encoding...'}
                {postStage === 'done' && (scheduleDate ? 'Scheduled! 🎉' : 'Posted! 🎉')}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: 360, maxWidth: "80vw" }}>
            <div style={{
              width: "100%", height: 6, borderRadius: 99,
              background: "#27272a", overflow: "hidden",
            }}>
              <div style={{
                width: `${postProgress}%`, height: "100%",
                background: postStage === 'done'
                  ? "#4ade80"
                  : (selectedPlatforms.length === 1 ? `linear-gradient(90deg, ${selectedPlatforms[0].color}, ${selectedPlatforms[0].color}99)` : `linear-gradient(90deg, #7c3aed, ${INDIGO})`),
                borderRadius: 99,
                transition: "width 0.18s ease-out",
                boxShadow: postStage === 'done' ? "0 0 12px rgba(74,222,128,0.6)" : (selectedPlatforms.length === 1 ? `0 0 12px ${selectedPlatforms[0].glow}` : `0 0 12px rgba(124,58,237,0.4)`),
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "#71717a" }}>
                {postStage === 'uploading' && 'Uploading to servers...'}
                {postStage === 'processing' && 'Queuing render job...'}
                {postStage === 'done' && (scheduleDate ? 'Redirecting to calendar...' : 'Redirecting to dashboard...')}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: postStage === 'done' ? "#4ade80" : (selectedPlatforms.length === 1 ? selectedPlatforms[0].color : "#a5b4fc"),
              }}>
                {postProgress}%
              </span>
            </div>
          </div>

          {/* Animated dots */}
          {postStage !== 'done' && (
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: selectedPlatforms.length === 1 ? selectedPlatforms[0].color : "#a5b4fc",
                  opacity: 0.6,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}

          <style>{`
            @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bounce  {
              0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
              40%            { transform: scale(1.2); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* DOWNLOAD RENDERING OVERLAY */}
      {downloadStage && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 28,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `#10b98118`,
              border: `1.5px solid #10b981`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#10b981",
              boxShadow: `0 0 24px rgba(16, 185, 129, 0.4)`,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                High-Quality Render
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.03em" }}>
                {downloadStage === 'rendering' ? 'Rendering Video...' : 'Download Ready! 🎉'}
              </div>
            </div>
          </div>

          <div style={{ width: 360, maxWidth: "80vw" }}>
            <div style={{
              width: "100%", height: 6, borderRadius: 99,
              background: "#27272a", overflow: "hidden",
            }}>
              <div style={{
                width: `${downloadProgress}%`, height: "100%",
                background: "#10b981",
                borderRadius: 99,
                transition: "width 0.18s ease-out",
                boxShadow: "0 0 12px rgba(16, 185, 129, 0.6)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "#71717a" }}>
                {downloadStage === 'rendering' ? 'Baking subtitles and effects...' : 'Starting download...'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#10b981" }}>
                {downloadProgress}%
              </span>
            </div>
          </div>

          {downloadStage === 'rendering' && (
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#10b981",
                  opacity: 0.6,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
