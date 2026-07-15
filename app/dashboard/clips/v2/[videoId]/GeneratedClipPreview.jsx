"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { parseMedia } from "@remotion/media-parser";
import { VideoComposition } from "../../../../components/VideoComposition";
import { parseSubtitleString } from "../../../../utils/parseSubtitles";
import { CAPTION_THEMES, PLATFORMS } from "../../../../components/CaptionEditor";
import { useRenderContext } from "@/contexts/RenderContext";
import { Loader2, Trash2 } from "lucide-react";
const INDIGO = "#6366f1";
const DEFAULT_SUBTITLES = `[00:00:00] Was being in prison kind of fun? Um, fun?
[00:00:07] No, I wouldn't say fun. Like, what was kind of cool about it,
[00:00:12] I've always wanted to go to jail. You know, there's this old saying
[00:00:17] that you don't go to jail to make friends. And I made some lifelong friends.`;

const parseStartTimeToMs = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  } else {
    seconds = parseFloat(timeStr);
  }
  return seconds * 1000;
};

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
  const [clipMetas, setClipMetas] = useState({});
  const [availableClips, setAvailableClips] = useState([]);
  const [clipsLoading, setClipsLoading] = useState(true);
  const [activeClipData, setActiveClipData] = useState(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [postStage, setPostStage] = useState(null);
  const [postProgress, setPostProgress] = useState(0);
  const [postError, setPostError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { addRenderTask, tasks } = useRenderContext();

  const handleDelete = async (clipId) => {
    if (!confirm("Are you sure you want to delete this clip to save storage?")) return;
    setDeletingId(clipId);
    try {
      const res = await fetch(`/api/video/clips/${clipId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete clip");
      setAvailableClips(prev => prev.filter(c => c.id !== clipId));
    } catch (e) {
      alert("Error deleting clip: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const recommendedShorts = aiAnalysis?.recommended_shorts || [];

  useEffect(() => {
    let cancelled = false;
    setClipsLoading(true);
    fetch(`/api/video/output/${videoId}/list`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ clips }) => { if (!cancelled) setAvailableClips(clips || []); })
      .catch((e) => console.error("clip list error:", e))
      .finally(() => { if (!cancelled) setClipsLoading(false); });
    return () => { cancelled = true; };
  }, [videoId]);

  useEffect(() => {
    if (!availableClips.length) return;
    availableClips.forEach((clip) => {
      const metaKey = clip.id || clip.url;
      // Don't refetch if we already have the meta for this exact clip
      if (clipMetas[metaKey]) return;

      parseMedia({ src: clip.url, fields: { durationInSeconds: true, fps: true }, acknowledgeRemotionLicense: true })
        .then((m) => setClipMetas((p) => ({ ...p, [metaKey]: { durationInSeconds: m.durationInSeconds, fps: m.fps } })))
        .catch(console.error);
    });
  }, [availableClips, clipMetas]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pr, sr] = await Promise.all([fetch("/api/preferences"), fetch(`/api/video/subtitles/v2/${videoId}`)]);
        if (pr.ok) {
          const { preferences: p } = await pr.json();
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
        if (sr.ok) {
          const d = await sr.json();
          setSubtitleInput(d.subtitles || DEFAULT_SUBTITLES);
          if (d.words) setWords(d.words);
        } else setSubtitleInput(DEFAULT_SUBTITLES);
      } catch { setSubtitleInput(DEFAULT_SUBTITLES); }
      finally { setIsLoaded(true); }
    };
    load();
  }, [videoId]);

  const captions = useMemo(() => parseSubtitleString(subtitleInput), [subtitleInput]);

  const buildInputProps = useMemo(() => (clipUrl, customHookText) => {
    const themeObj = { ...CAPTION_THEMES[activeTheme] };
    if (animationOverride !== "theme") themeObj.animation = animationOverride;
    const finalHookText = customHookText || hookText;
    const isHookActive = customHookText ? true : hookEnabled;
    return {
      videoUrl: clipUrl, fontSize, fontFamily: "Arial, sans-serif", verticalPosition,
      captions, theme: themeObj, words, overlays: [], brolls, bgMusicSrc, bgMusicVolume,
      hook: isHookActive ? { text: finalHookText, durationSecs: hookDurationSecs, fontSize: hookFontSize, fontColor: hookFontColor, verticalPosition: hookVerticalPosition, memeSrc: hookMemeSrc } : null,
    };
  }, [fontSize, verticalPosition, captions, words, activeTheme, animationOverride, brolls, bgMusicSrc, bgMusicVolume, hookEnabled, hookText, hookDurationSecs, hookFontSize, hookFontColor, hookVerticalPosition, hookMemeSrc]);

  const getFrames = (idx, customHookText) => {
    const fps = clipMetas[idx]?.fps ?? 30;
    const base = clipMetas[idx]?.durationInSeconds ? Math.ceil(clipMetas[idx].durationInSeconds * fps) : 450;
    const isHookActive = customHookText ? true : hookEnabled;
    return base + ((isHookActive && hookMemeSrc) ? Math.ceil(hookDurationSecs * fps) : 0);
  };

  const togglePlatform = (p) => setSelectedPlatforms((prev) => prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]);

  const handleOpenPost = (idx, clipUrl, clipId, customHookText, aiMeta) => {
    const inputProps = buildInputProps(clipUrl, customHookText);
    const metaKey = clipId || clipUrl;
    const fps = clipMetas[metaKey]?.fps ?? 30;
    const durationInFrames = (() => {
      const base = clipMetas[metaKey]?.durationInSeconds ? Math.ceil(clipMetas[metaKey].durationInSeconds * fps) : 450;
      const isHookActive = customHookText ? true : hookEnabled;
      return base + ((isHookActive && hookMemeSrc) ? Math.ceil(hookDurationSecs * fps) : 0);
    })();
    setActiveClipData({ idx, inputProps, durationInFrames, fps, clipUrl, customHookText, aiMeta });
    setPostError(null);
    setShowPlatformModal(true);
  };

  const handleConfirmPost = async () => {
    if (!activeClipData || selectedPlatforms.length === 0) return;
    const { idx, inputProps, durationInFrames, fps, clipUrl, customHookText, aiMeta } = activeClipData;
    setShowPlatformModal(false);
    
    try {
      setPostStage("processing");
      setPostProgress(10);
      setPostError(null);
      
      // Fake progress for UX
      const t = setInterval(() => { setPostProgress((p) => (p < 85 ? p + 5 : p)); }, 800);

      const targetPlatforms = selectedPlatforms.map((p) => p.name);

      const res = await fetch("/api/export/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputProps,
          videoId,
          durationInFrames,
          fps,
          targetPlatforms,
          scheduledFor: scheduleDate || null,
          downloadOnly: false,
        })
      });

      clearInterval(t);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to start export and post process");
      }
      
      if (data.renderId && data.bucketName) {
        addRenderTask(data.renderId, data.bucketName, { filename: `clip-${videoId}-${idx}.mp4`, isPostJob: true });
      }

      setPostProgress(100);
      setPostStage("done");
      
      setTimeout(() => {
        setPostStage(null);
        if (scheduleDate) {
          alert("Rendering... Will auto-schedule when done.");
          router.push("/dashboard/calendar");
        } else {
          alert("Rendering... Will auto-upload when done.");
        }
      }, 2000);

    } catch (e) {
      setPostStage(null);
      setPostError(e.message);
    }
  };

  const [cachedRenders, setCachedRenders] = useState({});
  const [downloadingIdx, setDownloadingIdx] = useState(null);

  const getCacheKey = (idx) => `render_cache_${videoId}_${idx}`;

  const handleDownload = async (idx, clipUrl, clipId, customHookText) => {
    setDownloadingIdx(idx);
    const inputProps = buildInputProps(clipUrl, customHookText);
    const metaKey = clipId || clipUrl;
    const fps = clipMetas[metaKey]?.fps ?? 30;
    const durationInFrames = (() => {
      const base = clipMetas[metaKey]?.durationInSeconds ? Math.ceil(clipMetas[metaKey].durationInSeconds * fps) : 450;
      const isHookActive = customHookText ? true : hookEnabled;
      return base + ((isHookActive && hookMemeSrc) ? Math.ceil(hookDurationSecs * fps) : 0);
    })();
    
    // Check if we already rendered this exact configuration
    const configHash = JSON.stringify({ inputProps, durationInFrames, fps });
    
    // 1. Check persistent localStorage (survives page reloads)
    try {
      const stored = localStorage.getItem(getCacheKey(idx));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.hash === configHash) {
          addRenderTask(parsed.renderId, parsed.bucketName, { filename: `clip-${videoId}-${idx}.mp4` });
          setDownloadingIdx(null);
          return;
        }
      }
    } catch(e) {}

    // 2. Check memory fallback (just in case localStorage is disabled)
    if (cachedRenders[idx] && cachedRenders[idx].hash === configHash) {
      const { renderId, bucketName } = cachedRenders[idx];
      addRenderTask(renderId, bucketName, { filename: `clip-${videoId}-${idx}.mp4` });
      setDownloadingIdx(null);
      return;
    }

    setPostError(null);
    try {
      const r = await fetch("/api/export/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...inputProps, videoId, durationInFrames, fps, downloadOnly: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      const { renderId, bucketName } = d;
      
      const newCache = { hash: configHash, renderId, bucketName };
      setCachedRenders(prev => ({ ...prev, [idx]: newCache }));
      try { localStorage.setItem(getCacheKey(idx), JSON.stringify(newCache)); } catch(e){}
      
      addRenderTask(renderId, bucketName, { filename: `clip-${videoId}-${idx}.mp4` });
    } catch (e) { 
      setPostError(e.message); 
    } finally {
      setDownloadingIdx(null);
    }
  };

  if (!isLoaded || clipsLoading) {
    return <div className="flex justify-center items-center h-64 text-[#4b5563] font-mono text-xs animate-pulse">{clipsLoading ? "Discovering clips from S3..." : "Initializing player..."}</div>;
  }

  if (!availableClips.length) {
    return <div className="flex flex-col items-center justify-center h-64 gap-2 text-[#6b7280] text-sm">No clips available yet — processing may still be underway.</div>;
  }

  return (
    <div className="flex flex-col gap-10 w-full pt-4 animate-fadeIn">
      {availableClips.map((clip, idx) => {
        const metaKey = clip.id || clip.url;
        const aiMeta = recommendedShorts[clip.index] || null;
        const clipUrl = clip.url;
        const fps = clipMetas[metaKey]?.fps ?? 30;
        
        // Helper to get duration since we replaced getFrames
        const customHookText = aiMeta?.title_or_hook;
        const isHookActive = customHookText ? true : hookEnabled;
        const getFrames = () => {
          const cFps = clipMetas[metaKey]?.fps ?? 30;
          const base = clipMetas[metaKey]?.durationInSeconds ? Math.ceil(clipMetas[metaKey].durationInSeconds * cFps) : 450;
          return base + ((isHookActive && hookMemeSrc) ? Math.ceil(hookDurationSecs * cFps) : 0);
        };
        
        const durationInFrames = getFrames();
        const inputProps = buildInputProps(clipUrl, customHookText);
        const score = aiMeta?.virality_score;
        const isClipRendering = tasks && Object.values(tasks).some(t => t.status === "rendering" && t.metadata?.filename === `clip-${videoId}-${idx}.mp4`);
        
        const clipStartMs = aiMeta?.start_time ? parseStartTimeToMs(aiMeta.start_time) : 0;
        const clipEndMs = clipStartMs + (aiMeta?.duration_seconds || 0) * 1000;
        const clipCaptions = captions.filter(c => c.endMs > clipStartMs && c.startMs < clipEndMs);
        const clipText = clipCaptions.map(c => c.text).join(' ');

        return (
          <div key={clip.id || idx} className="flex flex-col md:flex-row" style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(15,35,71,0.06)", opacity: deletingId === clip.id ? 0.5 : 1 }}>
            
            {/* ── Player (Left Side) ── */}
            <div className="w-full md:w-[35%] border-b md:border-b-0 md:border-r border-[#e5e7eb]" style={{ display: "flex", justifyContent: "center", padding: "24px", background: "#f9fafb" }}>
              <div style={{ height: "58vh", minHeight: 360, aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 0 1px #e5e7eb, 0 24px 64px rgba(0,0,0,0.8)", background: "#000" }}>
                {deletingId === clip.id ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4b5563]">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Deleting clip...</span>
                  </div>
                ) : (
                  <Player 
                    component={VideoComposition} 
                    inputProps={inputProps} 
                    durationInFrames={durationInFrames || 300} 
                    fps={fps} 
                    compositionHeight={1920} 
                    compositionWidth={1080} 
                    style={{ width: "100%", height: "100%" }} 
                    controls 
                    acknowledgeRemotionLicense 
                    errorFallback={(error) => (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px", textAlign: "center", background: "#ffffff", color: "#f87171" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Playback Error</span>
                        <span style={{ fontSize: 11, color: "#4b5563", wordBreak: "break-all" }}>{error.message || "Failed to decode video stream."}</span>
                        <a href={clipUrl} target="_blank" rel="noreferrer" style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, background: "#e5e7eb", border: "1px solid #d1d5db", color: "#0F2347", fontSize: 12, textDecoration: "none" }}>View Original Video</a>
                      </div>
                    )}
                    onError={(err) => console.error("Remotion Player Error:", err)}
                  />
                )}
              </div>
            </div>

            {/* ── Right Side (Meta + Actions) ── */}
            <div className="flex-1 flex flex-col justify-between">
              {/* ── Hook + Meta Header ── */}
              <div style={{ padding: "32px", borderBottom: "1px solid #e5e7eb", background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(124,58,237,0.03))", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#00C0D4", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", padding: "4px 12px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase" }}>Clip {clip.index + 1}</span>
                    {aiMeta?.is_new && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(239,68,68,0.8)", border: "1px solid #ef4444", padding: "4px 12px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase", boxShadow: "0 0 10px rgba(239,68,68,0.3)" }}>
                        ✨ NEW
                      </span>
                    )}
                    {score != null && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, ...(score >= 85 ? { color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" } : score >= 70 ? { color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" } : { color: "#4b5563", background: "#e5e7eb", border: "1px solid #d1d5db" }) }}>
                        🔥 Virality: {score}
                      </span>
                    )}
                    {clip.createdAt && (
                      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>
                        Generated {new Date(clip.createdAt).toLocaleDateString()} at {new Date(clip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {clip.id && (
                    <button onClick={() => handleDelete(clip.id)} disabled={deletingId === clip.id} style={{ background: "transparent", border: "none", color: "#f87171", cursor: deletingId === clip.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }} title="Delete Clip">
                      {deletingId === clip.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    </button>
                  )}
                </div>
                {aiMeta?.title_or_hook && (
                  <h3 style={{ margin: "0 0 16px", fontSize: 26, fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
                    🎣 {aiMeta.title_or_hook}
                  </h3>
                )}
                {aiMeta?.clip_topic && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Topic:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd", background: "rgba(196,181,253,0.08)", padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(196,181,253,0.2)" }}>{aiMeta.clip_topic}</span>
                  </div>
                )}
                {aiMeta?.rationale && <p style={{ margin: 0, fontSize: 14, color: "#d4d4d8", lineHeight: 1.6 }}>{aiMeta.rationale}</p>}
                {clipText && (
                  <div style={{ marginTop: 20 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Clip Subtitles</span>
                    <p style={{ margin: 0, fontSize: 13, color: "#4b5563", lineHeight: 1.6, fontStyle: "italic", background: "rgba(15,35,71,0.04)", padding: "12px 16px", borderRadius: 8, border: "1px solid #e5e7eb" }}>"{clipText}"</p>
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 12, background: "#ffffff" }}>
              <button onClick={() => handleOpenPost(idx, clipUrl, clip.id, customHookText, aiMeta)} disabled={!!postStage} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,#0F2347,${INDIGO})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(124,58,237,0.4)", opacity: postStage ? 0.5 : 1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Post Video Now
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => handleDownload(idx, clipUrl, clip.id, customHookText)} title={isClipRendering ? "Your video is in rendering you can see the progress from the right bottom task button" : undefined} disabled={!!postStage || downloadingIdx === idx || isClipRendering} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#0F2347", fontSize: 13, fontWeight: 600, cursor: isClipRendering ? "not-allowed" : "pointer", opacity: (postStage || downloadingIdx === idx || isClipRendering) ? 0.5 : 1 }}>
                  {downloadingIdx === idx ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                  {downloadingIdx === idx ? "Starting..." : isClipRendering ? "Rendering..." : "Download"}
                </button>
                <button onClick={() => router.push(`/editor/${videoId}?index=${clip.index}`)} disabled={!!postStage} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#0F2347", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: postStage ? 0.5 : 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Edit Clip
                </button>
              </div>
              {postError && <p style={{ fontSize: 11, color: "#f87171", textAlign: "center", background: "rgba(239,68,68,0.08)", padding: "8px", borderRadius: 6, margin: 0 }}>✕ {postError}</p>}
            </div>
            </div>
          </div>
        );
      })}

      {/* ── Platform Modal ── */}
      {showPlatformModal && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 20, padding: "32px 28px", width: 460, maxWidth: "calc(100vw - 32px)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0F2347", letterSpacing: "-0.03em" }}>Where to post?</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Choose the platform</p></div>
              <button onClick={() => { setShowPlatformModal(false); setSelectedPlatforms([]); setScheduleDate(""); }} style={{ background: "#e5e7eb", border: "1px solid #d1d5db", borderRadius: 8, width: 32, height: 32, color: "#4b5563", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {PLATFORMS.map((platform) => {
                const isSel = selectedPlatforms.some((p) => p.id === platform.id);
                const isAvailable = platform.name === "YouTube";
                return (
                  <button key={platform.id} onClick={() => { if (isAvailable) togglePlatform(platform); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 12, cursor: isAvailable ? "pointer" : "not-allowed", background: isSel ? platform.bg : "#f9fafb", border: `1.5px solid ${isSel ? platform.border : "#e5e7eb"}`, color: isSel ? platform.color : "#4b5563", textAlign: "left", transition: "all 0.15s ease", opacity: isAvailable ? 1 : 0.4 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: isSel ? `${platform.color}18` : "#ffffff", border: `1px solid ${isSel ? platform.border : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isSel ? platform.color : "#9ca3af" }}>{platform.icon}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: isSel ? "#0F2347" : "#d4d4d8" }}>{platform.name}</div><div style={{ fontSize: 12, color: isSel ? "#4b5563" : "#9ca3af", marginTop: 2 }}>{isAvailable ? platform.description : "Temporarily unavailable"}</div></div>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSel ? platform.color : "#d1d5db"}`, background: isSel ? platform.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#d4d4d8", marginBottom: 8 }}>Schedule (Optional)</label>
              <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} onClick={(e) => e.target.showPicker && e.target.showPicker()} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "#f9fafb", border: "1px solid #d1d5db", color: "#0F2347", fontSize: 14, outline: "none", colorScheme: "dark", cursor: "pointer" }} />
            </div>
            <button onClick={handleConfirmPost} disabled={selectedPlatforms.length === 0} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: selectedPlatforms.length > 0 ? `linear-gradient(135deg,#0F2347,${INDIGO})` : "#e5e7eb", color: selectedPlatforms.length > 0 ? "#fff" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: selectedPlatforms.length > 0 ? "pointer" : "not-allowed" }}>
              {selectedPlatforms.length > 0 ? (scheduleDate ? `Schedule for ${selectedPlatforms.length} platform(s)` : `Post to ${selectedPlatforms.length} platform(s)`) : "Select a platform"}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Post Progress Overlay ── */}
      {postStage && selectedPlatforms.length > 0 && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F2347" }}>{postStage === "uploading" && "Uploading video..."}{postStage === "processing" && "Processing & encoding..."}{postStage === "done" && (scheduleDate ? "Scheduled! 🎉" : "Posted! 🎉")}</div>
          <div style={{ width: 360, maxWidth: "80vw" }}>
            <div style={{ width: "100%", height: 6, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
              <div style={{ width: `${postProgress}%`, height: "100%", background: postStage === "done" ? "#4ade80" : `linear-gradient(90deg,#0F2347,${INDIGO})`, borderRadius: 99, transition: "width 0.18s ease-out" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: postStage === "done" ? "#4ade80" : "#a5b4fc" }}>{postProgress}%</span></div>
          </div>
        </div>,
        document.body
      )}


      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
