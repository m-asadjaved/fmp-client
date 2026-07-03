"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { parseMedia } from "@remotion/media-parser";
import { VideoComposition } from "./VideoComposition";
import { parseSubtitleString } from "../utils/parseSubtitles";

// ── Indigo palette ─────────────────────────────────────────────────────────────
const INDIGO = "#6366f1";
const INDIGO_DIM = "rgba(99,102,241,0.6)";
const INDIGO_GLOW = "rgba(99,102,241,0.35)";
const INDIGO_SOFT = "rgba(99,102,241,0.1)";
const INDIGO_BORDER = "rgba(99,102,241,0.25)";

export const CAPTION_THEMES = {
  classic: {
    id: "classic",
    name: "Classic",
    fontColor: "#ffffff",
    activeWordColor: "#a3e635",
    textShadow: "2px 2px 4px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.9), 2px -2px 4px rgba(0,0,0,0.9), -2px 2px 4px rgba(0,0,0,0.9), 0px 4px 12px rgba(0,0,0,1)",
    textTransform: "none",
    fontWeight: "bold",
    animation: "pop",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    fontColor: "#ffffff",
    activeWordColor: "#06b6d4",
    textShadow: "-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0px 4px 10px rgba(0,0,0,0.8)",
    textTransform: "uppercase",
    fontWeight: "900",
    animation: "slide",
  },
  hormozi: {
    id: "hormozi",
    name: "Hormozi",
    fontColor: "#ffffff",
    activeWordColor: "#fbbf24",
    textShadow: "0px 0px 15px rgba(0,0,0,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
    textTransform: "uppercase",
    fontWeight: "900",
    animation: "pop",
  },
  minimalist: {
    id: "minimalist",
    name: "Minimalist",
    fontColor: "#ffffff",
    activeWordColor: "#34d399",
    textShadow: "0px 2px 8px rgba(0,0,0,0.6)",
    textTransform: "none",
    fontWeight: "600",
    animation: "fade",
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    fontColor: "#ffffff",
    activeWordColor: "#eab308",
    textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
    textTransform: "none",
    fontWeight: "500",
    animation: "fade",
  },
  mrbeast: {
    id: "mrbeast",
    name: "MrBeast",
    fontColor: "#ffffff",
    activeWordColor: "#ef4444",
    textShadow: "-4px -4px 0 #0891b2, 4px -4px 0 #0891b2, -4px 4px 0 #0891b2, 4px 4px 0 #0891b2, 0px 6px 15px rgba(0,0,0,0.9)",
    textTransform: "uppercase",
    fontWeight: "900",
    animation: "pop",
  },
  cinematic: {
    id: "cinematic",
    name: "Cinematic",
    fontColor: "#ffffff",
    activeWordColor: "#fbbf24",
    textShadow: "0px 4px 15px rgba(0,0,0,0.9)",
    textTransform: "uppercase",
    fontWeight: "400",
    animation: "slide",
  },
  vlogger: {
    id: "vlogger",
    name: "Vlogger",
    fontColor: "#fef08a",
    activeWordColor: "#ec4899",
    textShadow: "-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 5px 5px 0px rgba(0,0,0,1)",
    textTransform: "none",
    fontWeight: "800",
    animation: "pop",
  }
};

// ── Social platforms config ────────────────────────────────────────────────────
export const PLATFORMS = [
  {
    id: "youtube",
    name: "YouTube",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.3)",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    description: "Share to your YouTube channel",
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.3)",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
      </svg>
    ),
    description: "Post as a TikTok short",
  },
  {
    id: "instagram",
    name: "Instagram Reels",
    color: "#e11d74",
    glow: "rgba(225,29,116,0.3)",
    bg: "rgba(225,29,116,0.08)",
    border: "rgba(225,29,116,0.25)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    description: "Publish as an Instagram Reel",
  },
];




const DEFAULT_SUBTITLES = `[00:00:00] Was being in prison kind of fun? Um, fun?
[00:00:07] No, I wouldn't say fun. Like, what was kind of cool about it,
[00:00:12] I've always wanted to go to jail. You know, there's this old saying
[00:00:17] that you don't go to jail to make friends. And I made some lifelong friends.`;

// ── Tiny primitives ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "#a5b4fc", margin: "0 0 8px",
  }}>
    {children}
  </p>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
    <span style={{ fontSize: 11.5, color: "#4a5568" }}>{label}</span>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#a1a1aa", fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>
);

const Divider = () => (
  <div style={{
    height: 1,
    background: `linear-gradient(to right, transparent, ${INDIGO_BORDER}, transparent)`,
    margin: "2px 0",
  }} />
);

// ── Field wrapper ─────────────────────────────────────────────────────────────
const FieldInput = ({ value, onChange, placeholder, mono }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%",
      padding: "9px 12px",
      borderRadius: 8,
      background: "#27272a",
      border: `1px solid ${INDIGO_BORDER}`,
      color: "#fafafa",
      fontSize: mono ? 11.5 : 13,
      fontFamily: mono ? "'JetBrains Mono','Fira Code',monospace" : "'Inter',sans-serif",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.15s, box-shadow 0.15s",
    }}
    onFocus={e => {
      e.target.style.borderColor = INDIGO_DIM;
      e.target.style.boxShadow = `0 0 0 3px ${INDIGO_SOFT}`;
    }}
    onBlur={e => {
      e.target.style.borderColor = INDIGO_BORDER;
      e.target.style.boxShadow = "none";
    }}
  />
);

// ── Subtitle textarea with header bar ────────────────────────────────────────
const SubtitleEditor = ({ value, onChange, lineCount, onReset, videoId, onWordsChange }) => {
  const isDefault = value === DEFAULT_SUBTITLES;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSubtitles = async () => {
    try {
      setIsGenerating(true);
      if (!videoId) {
        alert("Invalid Video Source. Could not extract video ID to transcribe.");
        setIsGenerating(false);
        return;
      }

      const response = await fetch(`/api/video/subtitles/v2/${videoId}`);
      if (!response.ok) throw new Error("Failed to generate subtitles");

      const data = await response.json();
      if (data.subtitles) {
        onChange(data.subtitles);
      }
      if (data.words && onWordsChange) {
        onWordsChange(data.words);
      }
    } catch (error) {
      console.error("Transcription Error:", error);
      alert("Error generating subtitles. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${INDIGO_BORDER}`,
      overflow: "hidden",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", background: "rgba(37,99,235,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(0,0,0,0.08)" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: INDIGO_BORDER }} />
          <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 700, letterSpacing: "0.05em", marginLeft: 4 }}>
            CAPTIONS
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* AI Generation Button */}
          <button
            onClick={handleGenerateSubtitles}
            disabled={isGenerating}
            style={{
              background: isGenerating ? "rgba(163,230,53,0.02)" : "rgba(163,230,53,0.1)",
              border: `1px solid ${isGenerating ? "rgba(163,230,53,0.2)" : INDIGO_BORDER}`,
              borderRadius: 6, color: isGenerating ? "#6b7280" : INDIGO,
              fontSize: 10, fontWeight: 600, padding: "5px 12px",
              cursor: isGenerating ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.15s ease-in-out", outline: "none",
              textTransform: "uppercase", letterSpacing: "0.03em",
              boxShadow: isGenerating ? "none" : `0 0 8px ${INDIGO_SOFT}`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isGenerating ? "spin 1s linear infinite" : "none" }}>
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
            </svg>
            {isGenerating ? "Transcribing..." : "Transcribe"}
          </button>

          <button
            onClick={onReset}
            disabled={isDefault}
            style={{
              background: isDefault ? "rgba(255, 255, 255, 0.02)" : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${isDefault ? "rgba(255, 255, 255, 0.05)" : "rgba(239, 68, 68, 0.25)"}`,
              borderRadius: 6, color: isDefault ? "#a1a1aa" : "#f87171",
              fontSize: 10, fontWeight: 600, padding: "5px 10px", cursor: isDefault ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s ease-in-out",
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Slider ────────────────────────────────────────────────────────────────────
const IndigoSlider = ({ label, value, min, max, unit, leftLabel, rightLabel, onChange }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      <span style={{
        fontSize: 12, fontWeight: 700, color: INDIGO,
        fontVariantNumeric: "tabular-nums",
        textShadow: `0 0 12px ${INDIGO_GLOW}`,
      }}>
        {value}{unit}
      </span>
    </div>
    <div style={{ position: "relative" }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", cursor: "pointer" }}
      />
    </div>
    {(leftLabel || rightLabel) && (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a1a1aa", marginTop: 4 }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    )}
  </div>
);

// ── Live Transcript Component ──────────────────────────────────────────────────
const LiveTranscript = ({ playerRef, captions, fps, hookDurationFrames, onEditCaption, brolls, onAddBroll, onRemoveBroll }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const current = playerRef.current;
    if (!current) return;
    const onFrameUpdate = (e) => setCurrentFrame(e.detail.frame);
    current.addEventListener("frameupdate", onFrameUpdate);
    return () => current.removeEventListener("frameupdate", onFrameUpdate);
  }, [playerRef]);

  const currentMs = ((currentFrame - (hookDurationFrames || 0)) / fps) * 1000;
  const activeCaptionIndex = captions.findIndex(c => currentMs >= c.startMs && currentMs <= c.endMs);

  useEffect(() => {
    if (activeCaptionIndex >= 0 && !showAll) {
      const el = document.getElementById(`caption-${activeCaptionIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeCaptionIndex, showAll]);

  const handleSeek = (startMs) => {
    if (playerRef.current) {
      const frame = (hookDurationFrames || 0) + Math.floor((startMs / 1000) * fps);
      playerRef.current.seekTo(frame);
    }
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      borderTop: `1px solid #27272a`, background: "#09090b", overflow: "hidden"
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid #27272a`,
        background: "#18181b", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: INDIGO,
            boxShadow: `0 0 12px ${INDIGO}`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fafafa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Live Captions
          </span>
        </div>
        <button 
          onClick={() => setShowAll(!showAll)}
          style={{
            fontSize: 10, padding: "4px 8px", borderRadius: 4, 
            background: showAll ? "rgba(239, 68, 68, 0.1)" : "rgba(99,102,241,0.1)", 
            color: showAll ? "#f87171" : "#a5b4fc", 
            border: `1px solid ${showAll ? "rgba(239,68,68,0.3)" : INDIGO_BORDER}`, cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          {showAll ? "View Timeline" : "See All Captions"}
        </button>
      </div>

      {showAll ? (
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          color: "#d4d4d8", fontSize: 14, lineHeight: 1.8, fontFamily: "'Inter', sans-serif",
          whiteSpace: "pre-wrap"
        }}>
          {captions.map(c => c.text.trim()).join(" ")}
        </div>
      ) : (
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12
        }}>
          {captions.map((caption, i) => {
            const isActive = i === activeCaptionIndex;
            const currentBroll = brolls.find(b => b.captionIndex === i);
            return (
              <div key={i} id={`caption-${i}`}
                onClick={() => handleSeek(caption.startMs + 10)}
              style={{
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${isActive ? INDIGO_BORDER : "#27272a"}`,
                background: isActive ? "rgba(99,102,241,0.06)" : "#18181b",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: isActive ? INDIGO_DIM : "#a1a1aa", fontFamily: "monospace" }}>
                  {new Date(caption.startMs).toISOString().substring(11, 23)} - {new Date(caption.endMs).toISOString().substring(11, 23)}
                </div>
                {currentBroll ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveBroll(i); }}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}
                  >
                    Remove B-Roll
                  </button>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddBroll(i, caption.startMs, caption.endMs); }}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: `1px solid ${INDIGO_BORDER}`, cursor: "pointer" }}
                  >
                    + Upload B-Roll
                  </button>
                )}
              </div>
              <textarea
                value={caption.text.trimEnd()}
                onChange={(e) => onEditCaption(i, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", background: "transparent", border: "none", color: isActive ? "#fff" : "#6b7280",
                  fontSize: 13, lineHeight: 1.5, outline: "none", resize: "none", padding: 0,
                  height: "auto", minHeight: 40, fontFamily: "'Inter', sans-serif"
                }}
              />
              {currentBroll && (
                 <div style={{ fontSize: 10, color: "#71717a", wordBreak: "break-all", background: "#09090b", padding: "4px 8px", borderRadius: 4, display: "flex", justifyContent: "space-between" }}>
                   <span>B-Roll {currentBroll.isUploading ? "(Uploading...)" : "(Ready)"}</span>
                 </div>
              )}
            </div>
          );
        })}
        {captions.length === 0 && (
          <div style={{ textAlign: "center", color: "#71717a", fontSize: 12, marginTop: 40 }}>
            No subtitles found. Generate some using AI!
          </div>
        )}
        </div>
      )}
    </div>
  );
};

// ── Editor ────────────────────────────────────────────────────────────────────
export default function CaptionEditor({ videoId, initialJob }) {
  const [subtitleInput, setSubtitleInput] = useState("");
  const [isSubtitlesLoading, setIsSubtitlesLoading] = useState(false);
  const [fontSize, setFontSize] = useState(56);
  const [activeTheme, setActiveTheme] = useState("classic");
  const [animationOverride, setAnimationOverride] = useState("theme");
  const [verticalPosition, setVerticalPosition] = useState(80);
  
  // ── Preferences persistence state ─────────────────────────────────────────
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSavedAt, setPrefsSavedAt] = useState(null);
  const [prefsError, setPrefsError] = useState(null);

  // Construct the S3 URL dynamically based on the videoId parameter if provided.
  const initialVideoUrl = videoId 
    ? `https://fmp-641079926683-us-east-1-an.s3.us-east-1.amazonaws.com/processed_videos/output-${videoId}.mp4`
    : "";
    
  const [videoSrc, setVideoSrc] = useState(initialVideoUrl);
  const [preloadedVideoSrc, setPreloadedVideoSrc] = useState(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [words, setWords] = useState([]);
  const [brolls, setBrolls] = useState([]);
  const [bgMusicSrc, setBgMusicSrc] = useState("");
  const [bgMusicVolume, setBgMusicVolume] = useState(20);
  const [isUploadingBgMusic, setIsUploadingBgMusic] = useState(false);
  
  const [hookEnabled, setHookEnabled] = useState(false);
  const [hookText, setHookText] = useState("WAIT FOR IT...");
  const [hookDurationSecs, setHookDurationSecs] = useState(3);
  const [hookFontSize, setHookFontSize] = useState(72);
  const [hookFontColor, setHookFontColor] = useState("#fbbf24");
  const [hookVerticalPosition, setHookVerticalPosition] = useState(20);
  const [hookMemeSrc, setHookMemeSrc] = useState("");
  const [isUploadingMeme, setIsUploadingMeme] = useState(false);
  const [isMemeModalOpen, setIsMemeModalOpen] = useState(false);
  const [memeList, setMemeList] = useState([]);
  const [isLoadingMemes, setIsLoadingMemes] = useState(false);

  // ── Load preferences on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/preferences')
      .then(res => res.json())
      .then(({ preferences: p }) => {
        if (!p) return;
        if (p.active_theme)          setActiveTheme(p.active_theme);
        if (p.animation_override)    setAnimationOverride(p.animation_override);
        if (p.font_size != null)     setFontSize(p.font_size);
        if (p.vertical_position != null) setVerticalPosition(p.vertical_position);
        if (p.bg_music_volume != null)   setBgMusicVolume(p.bg_music_volume);
        if (p.hook_enabled != null)      setHookEnabled(p.hook_enabled);
        if (p.hook_text)             setHookText(p.hook_text);
        if (p.hook_duration_secs != null) setHookDurationSecs(p.hook_duration_secs);
        if (p.hook_font_size != null)    setHookFontSize(p.hook_font_size);
        if (p.hook_font_color)       setHookFontColor(p.hook_font_color);
        if (p.hook_vertical_position != null) setHookVerticalPosition(p.hook_vertical_position);
      })
      .catch(err => console.warn("Could not load preferences:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save preferences handler ─────────────────────────────────────────────────
  const handleSavePreferences = useCallback(async () => {
    setIsSavingPrefs(true);
    setPrefsError(null);
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeTheme,
          animationOverride,
          fontSize,
          verticalPosition,
          bgMusicVolume,
          hookEnabled,
          hookText,
          hookDurationSecs,
          hookFontSize,
          hookFontColor,
          hookVerticalPosition,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }
      setPrefsSavedAt(new Date());
    } catch (err) {
      console.error('Save preferences error:', err);
      setPrefsError(err.message);
    } finally {
      setIsSavingPrefs(false);
    }
  }, [activeTheme, animationOverride, fontSize, verticalPosition, bgMusicVolume, hookEnabled, hookText, hookDurationSecs, hookFontSize, hookFontColor, hookVerticalPosition]);

  useEffect(() => {
    if (isMemeModalOpen && memeList.length === 0) {
      setIsLoadingMemes(true);
      fetch('/api/memes')
        .then(res => res.json())
        .then(data => {
          if (data.memes) {
            setMemeList(data.memes);
          }
        })
        .catch(err => console.error("Failed to load memes", err))
        .finally(() => setIsLoadingMemes(false));
    }
  }, [isMemeModalOpen, memeList.length]);

  const [videoMeta, setVideoMeta] = useState(null);

  useEffect(() => {
    if (!videoSrc) return;
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

  const playerRef = useRef(null);

  const captions = useMemo(() => parseSubtitleString(subtitleInput), [subtitleInput]);
  const lineCount = captions.length;
  const durationMs = captions.length > 0 ? captions[captions.length - 1].endMs : 10000;

  useEffect(() => {
    if (videoId) {
      setIsSubtitlesLoading(true);
      fetch(`/api/video/subtitles/v2/${videoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.subtitles) {
            setSubtitleInput(data.subtitles);
          } else {
            setSubtitleInput(DEFAULT_SUBTITLES);
          }
          if (data.words) {
            setWords(data.words);
          }
        })
        .catch(err => {
          console.error("Failed to fetch subtitles:", err);
          setSubtitleInput(DEFAULT_SUBTITLES);
        })
        .finally(() => {
          setIsSubtitlesLoading(false);
        });
    } else {
      setSubtitleInput(DEFAULT_SUBTITLES);
    }
  }, [videoId]);

  const handleEditCaption = (index, newText) => {
    const updatedCaptions = [...captions];
    updatedCaptions[index].text = newText;

    const newString = updatedCaptions.map(c => {
      const d = new Date(c.startMs);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      const mmm = String(d.getUTCMilliseconds()).padStart(3, '0');
      return `[${hh}:${mm}:${ss}.${mmm}] ${c.text}`;
    }).join("\n");

    setSubtitleInput(newString);
  };

  const fps = videoMeta?.fps ?? 30; // Fallback to 30 while loading
  const baseDurationFrames = (videoMeta && videoMeta.durationInSeconds && fps)
    ? Math.ceil(videoMeta.durationInSeconds * fps)
    : (Math.ceil((durationMs / 1000) * fps) || 450);
    
  const hookDurationFrames = (hookEnabled && hookMemeSrc) ? Math.ceil(hookDurationSecs * fps) : 0;
  const durationInFrames = baseDurationFrames + hookDurationFrames;

  // ── Post modal + simulation state ────────────────────────────────────────────
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => {
    if (initialJob?.platforms && Array.isArray(initialJob.platforms)) {
      return PLATFORMS.filter(p => initialJob.platforms.includes(p.name));
    }
    return [];
  });
  const [scheduleDate, setScheduleDate] = useState(() => {
    if (initialJob?.scheduled_for) {
      const d = new Date(initialJob.scheduled_for);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return (new Date(d - tzOffset)).toISOString().slice(0, 16);
    }
    return "";
  });
  const [postStage, setPostStage] = useState(null); // null | 'uploading' | 'processing' | 'done'
  const [postProgress, setPostProgress] = useState(0);
  const [postError, setPostError] = useState(null);
  const router = useRouter();

  const videoIdMatch = videoSrc.match(/output-(.+)\.mp4/);
  const parsedVideoId = videoIdMatch ? videoIdMatch[1] : "";

  const handleAddBroll = (index, startMs, endMs) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const localUrl = URL.createObjectURL(file);
      setBrolls(prev => {
        const filtered = prev.filter(b => b.captionIndex !== index);
        return [...filtered, { captionIndex: index, url: localUrl, startMs, endMs, isUploading: true }];
      });

      try {
        // User-scoped broll upload → user_uploads/broll/[userId]/
        const response = await fetch('/api/upload/broll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setBrolls(prev => prev.map(b => b.captionIndex === index ? { ...b, url: publicUrl, isUploading: false } : b));
      } catch (err) {
        console.error("B-Roll upload failed", err);
        alert("Upload failed: " + err.message);
        setBrolls(prev => prev.map(b => b.captionIndex === index ? { ...b, isUploading: false } : b));
      }
    };
    input.click();
  };

  const handleRemoveBroll = (index) => {
    setBrolls(prev => prev.filter(b => b.captionIndex !== index));
  };

  const handlePreloadVideo = async () => {
    setIsPreloading(true);
    try {
      const res = await fetch(videoSrc);
      const blob = await res.blob();
      setPreloadedVideoSrc(URL.createObjectURL(blob));
    } catch(e) {
      console.error(e);
      alert("Failed to preload video.");
    }
    setIsPreloading(false);
  };

  const handleUploadBgMusic = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const localUrl = URL.createObjectURL(file);
      setBgMusicSrc(localUrl);
      setIsUploadingBgMusic(true);

      try {
        // User-scoped bg music upload → user_uploads/bg_music/[userId]/
        const response = await fetch('/api/upload/bg-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setBgMusicSrc(publicUrl);
      } catch (err) {
        console.error("BG Music upload failed", err);
        alert("Upload failed: " + err.message);
      } finally {
        setIsUploadingBgMusic(false);
      }
    };
    input.click();
  };

  const handleUploadMeme = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const localUrl = URL.createObjectURL(file);
      setHookMemeSrc(localUrl);
      setIsUploadingMeme(true);

      try {
        // User-scoped hook/meme upload → user_uploads/hooks/[userId]/
        const response = await fetch('/api/upload/hook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        if (!response.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setHookMemeSrc(publicUrl);
      } catch (err) {
        console.error("Meme/Hook upload failed", err);
        alert("Upload failed: " + err.message);
      } finally {
        setIsUploadingMeme(false);
      }
    };
    input.click();
  };

  const inputProps = useMemo(() => {
    const themeObj = { ...CAPTION_THEMES[activeTheme] };
    if (animationOverride !== "theme") {
      themeObj.animation = animationOverride;
    }
    return {
      videoUrl: preloadedVideoSrc || videoSrc,
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
  }, [videoSrc, preloadedVideoSrc, fontSize, verticalPosition, captions, words, activeTheme, animationOverride, brolls, bgMusicSrc, bgMusicVolume, hookEnabled, hookText, hookDurationSecs, hookFontSize, hookFontColor, hookVerticalPosition, hookMemeSrc]);

  // ── Open platform picker ──────────────────────────────────────────────────────
  const openPostModal = () => {
    setPostError(null);
    setShowPlatformModal(true);
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => {
      if (prev.some(p => p.id === platform.id)) {
        return prev.filter(p => p.id !== platform.id);
      } else {
        return [...prev, platform];
      }
    });
  };

  // ── Confirm: run simulation then fire API ─────────────────────────────────────
  const handleConfirmPost = async () => {
    if (selectedPlatforms.length === 0) return;
    setShowPlatformModal(false);
    setPostError(null);

    // ── Stage 1: Uploading simulation (0 → 60%) ───────────────────────────────
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

    // ── Stage 2: Processing simulation (60 → 90%) ─────────────────────────────
    setPostStage('processing');
    await new Promise(resolve => {
      let p = 60;
      const t = setInterval(() => {
        p += Math.random() * 4 + 2;
        if (p >= 90) { p = 90; clearInterval(t); resolve(); }
        setPostProgress(Math.round(p));
      }, 220);
    });

    // ── Stage 3: Fire real API (90 → 100%) ───────────────────────────────────
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
          jobId: initialJob?.id || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start post job");

      // ── Stage 4: Done ──────────────────────────────────────────────────────
      setPostProgress(100);
      setPostStage('done');

      // Brief pause to show the ✓ before redirect
      await new Promise(r => setTimeout(r, 900));
      router.push("/dashboard/v2/calendar");
    } catch (err) {
      console.error("[handleConfirmPost]", err);
      setPostStage(null);
      setPostProgress(0);
      setPostError(err.message);
    }
  };

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#09090b", color: "#fafafa", fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── LEFT SIDEBAR (Controls & Export) ──────────────────────────── */}
      <div style={{
        width: 280, display: "flex", flexDirection: "column",
        borderRight: `1px solid #27272a`, background: "#18181b",
        overflowY: "auto", flexShrink: 0, zIndex: 20,
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid #27272a`,
          background: "#18181b", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${INDIGO} 0%, #d9f99d 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 18px ${INDIGO_GLOW}`, flexShrink: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.862v6.276a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  stroke="#1a2e05" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#fafafa" }}>
                FMP Editor
              </h1>
              <p style={{ fontSize: 10.5, color: INDIGO_DIM, margin: 0, fontWeight: 500 }}>
                Video Settings
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Background Music */}
          <div>
            <SectionLabel>Background Music</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button 
                onClick={handleUploadBgMusic} 
                disabled={isUploadingBgMusic}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8,
                  background: "rgba(99,102,241,0.1)", color: "#a5b4fc",
                  border: `1px solid ${INDIGO_BORDER}`,
                  fontSize: 11, fontWeight: 600, cursor: isUploadingBgMusic ? "default" : "pointer",
                  display: "flex", justifyContent: "center", alignItems: "center", gap: 6,
                  transition: "all 0.2s ease"
                }}
              >
                {isUploadingBgMusic ? "Uploading..." : "+ Upload Audio"}
              </button>
              {bgMusicSrc && (
                <button 
                  onClick={() => setBgMusicSrc("")} 
                  style={{
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.1)", color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.3)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {bgMusicSrc && (
              <IndigoSlider
                label="Music Volume" value={bgMusicVolume} min={0} max={100} unit="%"
                leftLabel="0%" rightLabel="100%" onChange={setBgMusicVolume}
              />
            )}
          </div>

          <Divider />

          {/* Video Hook */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionLabel>Video Hook</SectionLabel>
              <button 
                onClick={() => setHookEnabled(!hookEnabled)}
                style={{
                  fontSize: 10, padding: "4px 8px", borderRadius: 4, 
                  background: hookEnabled ? "rgba(34, 197, 94, 0.1)" : "rgba(161, 161, 170, 0.1)", 
                  color: hookEnabled ? "#4ade80" : "#a1a1aa", 
                  border: `1px solid ${hookEnabled ? "rgba(34, 197, 94, 0.3)" : "#3f3f46"}`, cursor: "pointer",
                }}
              >
                {hookEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {hookEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, display: "block", marginBottom: 6 }}>Meme Video (Plays before main video)</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={handleUploadMeme} 
                      disabled={isUploadingMeme}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 8,
                        background: "rgba(99,102,241,0.1)", color: "#a5b4fc",
                        border: `1px solid ${INDIGO_BORDER}`,
                        fontSize: 11, fontWeight: 600, cursor: isUploadingMeme ? "default" : "pointer",
                        display: "flex", justifyContent: "center", alignItems: "center", gap: 6,
                        transition: "all 0.2s ease"
                      }}
                    >
                      {isUploadingMeme ? "Uploading..." : "+ Upload Meme (3s)"}
                    </button>
                    <button 
                      onClick={() => setIsMemeModalOpen(true)}
                      style={{
                        padding: "8px 12px", borderRadius: 8,
                        background: "rgba(168, 85, 247, 0.1)", color: "#c084fc",
                        border: "1px solid rgba(168,85,247,0.3)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Library
                    </button>
                    {hookMemeSrc && (
                      <button 
                        onClick={() => setHookMemeSrc("")} 
                        style={{
                          padding: "8px 12px", borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.1)", color: "#f87171",
                          border: "1px solid rgba(239,68,68,0.3)",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <FieldInput value={hookText} onChange={setHookText} placeholder="WAIT FOR IT..." />
                
                <IndigoSlider
                  label="Meme Duration" value={hookDurationSecs} min={1} max={10} unit="s"
                  leftLabel="1s" rightLabel="10s" onChange={setHookDurationSecs}
                />
                
                <IndigoSlider
                  label="Position" value={hookVerticalPosition} min={0} max={100} unit="%"
                  leftLabel="Top" rightLabel="Bottom" onChange={setHookVerticalPosition}
                />
                
                <IndigoSlider
                  label="Font Size" value={hookFontSize} min={32} max={120} unit="px"
                  leftLabel="32px" rightLabel="120px" onChange={setHookFontSize}
                />
                
                <div>
                  <span style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, display: "block", marginBottom: 6 }}>Color</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={hookFontColor} onChange={e => setHookFontColor(e.target.value)}
                      style={{
                        width: 38, height: 38, borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${INDIGO_BORDER}`, background: "#fff", padding: 2, flexShrink: 0,
                      }}
                    />
                    <div style={{
                      flex: 1, padding: "9px 12px", borderRadius: 8,
                      background: "#27272a", border: `1px solid ${INDIGO_BORDER}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        background: hookFontColor, border: "1px solid rgba(0,0,0,0.1)",
                        boxShadow: `0 0 6px ${hookFontColor}55`,
                      }} />
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#a1a1aa" }}>
                        {hookFontColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Caption Themes */}
          <div>
            <SectionLabel>Caption Theme</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.values(CAPTION_THEMES).map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  style={{
                    padding: "8px", borderRadius: 8,
                    background: activeTheme === theme.id ? "rgba(99,102,241,0.15)" : "#09090b",
                    border: `1px solid ${activeTheme === theme.id ? INDIGO : "#27272a"}`,
                    color: activeTheme === theme.id ? "#fff" : "#a1a1aa",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Animation Override */}
          <div>
            <SectionLabel>Animation Style</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "theme", name: "Auto (Theme)" },
                { id: "pop", name: "Pop" },
                { id: "slide", name: "Slide" },
                { id: "fade", name: "Fade" },
                { id: "none", name: "None" }
              ].map(anim => (
                <button
                  key={anim.id}
                  onClick={() => setAnimationOverride(anim.id)}
                  style={{
                    padding: "8px", borderRadius: 8,
                    background: animationOverride === anim.id ? "rgba(99,102,241,0.15)" : "#09090b",
                    border: `1px solid ${animationOverride === anim.id ? INDIGO : "#27272a"}`,
                    color: animationOverride === anim.id ? "#fff" : "#a1a1aa",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {anim.name}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Font Size */}
          <IndigoSlider
            label="Font Size" value={fontSize} min={24} max={96} unit="px"
            leftLabel="24px" rightLabel="96px" onChange={setFontSize}
          />



          {/* Vertical Position */}
          <IndigoSlider
            label="Caption Position" value={verticalPosition} min={0} max={100} unit="%"
            leftLabel="↑ Top" rightLabel="Bottom ↓" onChange={setVerticalPosition}
          />

          <Divider />

          {/* Video Info */}
          <div style={{
            background: "#111827", border: `1px solid #d1d5db`,
            borderRadius: 8, padding: "12px",
          }}>
            <SectionLabel>Inspector</SectionLabel>
            <InfoRow label="Duration" value={`${(videoMeta?.durationInSeconds || (durationMs / 1000)).toFixed(1)}s`} />
            <InfoRow label="Frames" value={`${durationInFrames}`} />
            <InfoRow label="Resolution" value="1080 × 1920" />
            <InfoRow label="Format" value={`9:16 · ${videoMeta?.fps ? videoMeta.fps.toFixed(3) : 30}fps`} />
            <InfoRow label="Subtitles" value={`${lineCount} lines`} />
          </div>

          {/* ── Save Preferences Button ── */}
          <div>
            <button
              onClick={handleSavePreferences}
              disabled={isSavingPrefs}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "10px 16px", borderRadius: 10, border: `1px solid ${INDIGO_BORDER}`,
                background: isSavingPrefs ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.12)",
                color: isSavingPrefs ? INDIGO_DIM : "#a5b4fc",
                fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                cursor: isSavingPrefs ? "not-allowed" : "pointer", transition: "all 0.2s ease",
                letterSpacing: "-0.01em",
              }}
            >
              {isSavingPrefs ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Preferences
                </>
              )}
            </button>
            {prefsSavedAt && !prefsError && (
              <p style={{ fontSize: 10.5, color: "#4ade80", textAlign: "center", margin: "6px 0 0", fontWeight: 600 }}>
                ✓ Saved {prefsSavedAt.toLocaleTimeString()}
              </p>
            )}
            {prefsError && (
              <p style={{ fontSize: 10.5, color: "#f87171", textAlign: "center", margin: "6px 0 0" }}>
                ✕ {prefsError}
              </p>
            )}
          </div>

          {/* ── Post Button ── */}
          <div>
            <button
              onClick={openPostModal}
              disabled={!!postStage}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "13px 16px", borderRadius: 10, border: "none",
                background: postStage
                  ? "rgba(99,102,241,0.25)"
                  : `linear-gradient(135deg, #7c3aed, ${INDIGO})`,
                color: "#ffffff", fontSize: 13.5, fontWeight: 700,
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
              Post Video
            </button>
            {postError && (
              <p style={{
                fontSize: 10.5, color: "#f87171",
                textAlign: "center", margin: "6px 0 0",
                background: "rgba(239,68,68,0.08)",
                padding: "6px 8px", borderRadius: 6,
              }}>
                ✕ {postError}
              </p>
            )}
            <p style={{ fontSize: 10, color: "#71717a", textAlign: "center", marginTop: 6 }}>
              Renders in the background · You&apos;ll be notified when ready
            </p>
          </div>
          <div style={{ height: 4 }} />
        </div>
      </div>

      {/* ── CENTER WORKSPACE (Video Player) ──────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#111827",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid background for the "workspace" feel */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)",
          backgroundSize: "40px 40px", pointerEvents: "none", opacity: 0.5
        }} />

        <div style={{
          position: "absolute", top: 16, left: 24,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
          color: "#71717a", textTransform: "uppercase"
        }}>
          Preview Monitor
        </div>

        <div style={{
          height: "calc(100vh - 80px)", aspectRatio: "9 / 16", maxWidth: "90%", borderRadius: 12, overflow: "hidden",
          boxShadow: `0 0 0 1px #27272a, 0 24px 64px rgba(0,0,0,0.8)`,
          position: "relative", background: "#000"
        }}>
          <Player
            ref={playerRef}
            component={VideoComposition}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionHeight={1920}
            compositionWidth={1080}
            style={{ width: "100%", height: "100%" }}
            controls
            acknowledgeRemotionLicense
          />
        </div>
      </div>

      {/* ── RIGHT SIDEBAR (Captions & Transcript) ─────────────────────── */}
      <div style={{
        width: 400, display: "flex", flexDirection: "column",
        borderLeft: `1px solid #27272a`, background: "#18181b", zIndex: 10, position: "relative"
      }}>
        {isSubtitlesLoading && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(24,24,27,0.9)", zIndex: 50, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", border: `3px solid ${INDIGO_SOFT}`,
              borderTopColor: INDIGO, animation: "spin 1s linear infinite"
            }} />
            <div style={{ color: "#a5b4fc", fontSize: 14, fontWeight: 600, letterSpacing: "0.05em" }}>
              Loading Captions...
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <div style={{ padding: "16px 20px" }}>
          <SubtitleEditor
            value={subtitleInput}
            onChange={setSubtitleInput}
            lineCount={lineCount}
            onReset={() => {
              setSubtitleInput(DEFAULT_SUBTITLES);
              setWords([]);
              setBrolls([]);
            }}
            videoId={videoId}
            onWordsChange={setWords}
          />
        </div>
        <div style={{ height: 1, background: "#111827" }} />
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <LiveTranscript 
            playerRef={playerRef} 
            captions={captions} 
            fps={fps} 
            hookDurationFrames={hookDurationFrames}
            onEditCaption={handleEditCaption} 
            brolls={brolls}
            onAddBroll={handleAddBroll}
            onRemoveBroll={handleRemoveBroll}
          />
        </div>
      </div>

      {/* Meme Selection Modal */}
      {isMemeModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#18181b", width: 500, borderRadius: 12, padding: 24, border: `1px solid ${INDIGO_BORDER}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Select Pre-uploaded Meme</h3>
              <button onClick={() => setIsMemeModalOpen(false)} style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
              {isLoadingMemes && <div style={{ color: "#a1a1aa", fontSize: 13, gridColumn: "span 2", textAlign: "center", padding: 20 }}>Loading your memes...</div>}
              {!isLoadingMemes && memeList.length === 0 && <div style={{ color: "#a1a1aa", fontSize: 13, gridColumn: "span 2", textAlign: "center", padding: 20 }}>No memes found in /hooks/memes/</div>}
              {memeList.map(meme => (
                <button
                  key={meme.id}
                  onClick={() => {
                    setHookMemeSrc(meme.url);
                    setIsMemeModalOpen(false);
                  }}
                  style={{
                    padding: 16, background: "#27272a", borderRadius: 8, border: "1px solid #3f3f46",
                    color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = INDIGO}
                  onMouseOut={e => e.currentTarget.style.borderColor = "#3f3f46"}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: INDIGO_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    🎥
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{meme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────────────
          PLATFORM PICKER MODAL
      ──────────────────────────────────────────────────────────────────────── */}
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
                    {/* Platform icon */}
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
                    {/* Checkbox indicator */}
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

      {/* ────────────────────────────────────────────────────────────────────────
          UPLOAD SIMULATION OVERLAY
      ──────────────────────────────────────────────────────────────────────── */}
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

          {/* Keyframes injected inline */}
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
    </div>
  );
}
