"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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

const CAPTION_THEMES = {
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
export default function CaptionEditor({ videoId }) {
  const [subtitleInput, setSubtitleInput] = useState("");
  const [isSubtitlesLoading, setIsSubtitlesLoading] = useState(false);
  const [fontSize, setFontSize] = useState(56);
  const [activeTheme, setActiveTheme] = useState("classic");
  const [animationOverride, setAnimationOverride] = useState("theme");
  const [verticalPosition, setVerticalPosition] = useState(80);
  
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

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState(null);
  const [exportError, setExportError] = useState(null);

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
        const response = await fetch('/api/upload/broll', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setBrolls(prev => prev.map(b => b.captionIndex === index ? { ...b, url: publicUrl, isUploading: false } : b));
      } catch (err) {
        console.error("Upload failed", err);
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
        const response = await fetch('/api/upload/broll', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type })
        });
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setBgMusicSrc(publicUrl);
      } catch (err) {
        console.error("Upload failed", err);
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
        const response = await fetch('/api/upload/broll', {
          method: 'POST',
          body: JSON.stringify({ filename: `meme_${file.name}`, contentType: file.type })
        });
        const { uploadUrl, publicUrl } = await response.json();
        
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        setHookMemeSrc(publicUrl);
      } catch (err) {
        console.error("Upload failed", err);
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

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportUrl(null);
    setExportError(null);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputProps, durationInFrames, fps }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start export");

      const interval = setInterval(async () => {
        const progressRes = await fetch(`/api/export/progress?renderId=${data.renderId}&bucketName=${data.bucketName}`);
        const progressData = await progressRes.json();
        if (progressData.fatalErrorEncountered) {
          clearInterval(interval);
          console.error("Lambda Render Errors:", progressData.errors);
          const errorMsg = progressData.errors?.[0]?.message || progressData.errors?.[0]?.name || "An error occurred during rendering.";
          setExportError(`Lambda Error: ${errorMsg}`);
          setIsExporting(false);
        } else if (progressData.done) {
          clearInterval(interval);
          setExportUrl(progressData.outputFile);
          setExportProgress(100);
          setIsExporting(false);
        } else {
          setExportProgress(Math.round(progressData.overallProgress * 100));
        }
      }, 3000);
    } catch (err) {
      console.error(err);
      setExportError(err.message);
      setIsExporting(false);
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

          {/* Export Button replacing old RenderControls */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "11px 16px", borderRadius: 10, border: "none",
              background: isExporting ? "rgba(163,230,53,0.4)" : `linear-gradient(135deg, ${INDIGO}, #1d4ed8)`,
              color: "#ffffff", fontSize: 13.5, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              cursor: isExporting ? "not-allowed" : "pointer", transition: "all 0.2s ease",
              boxShadow: isExporting ? "none" : `0 4px 24px ${INDIGO_GLOW}`,
              letterSpacing: "-0.01em",
            }}
          >
            {isExporting ? (
              <span style={{ color: "rgba(255,255,255,0.8)" }}>Exporting... {exportProgress}%</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3l14 9-14 9V3z" fill="#ffffff" />
                </svg>
                Export to MP4
              </>
            )}
          </button>

          {exportUrl && (
            <a href={exportUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.3)",
                color: "#a5b4fc", fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15l-4-4h3V5h2v6h3l-4 4zM5 18h14v2H5v-2z" fill="#a5b4fc" />
                </svg>
                Download Exported Video
              </button>
            </a>
          )}
          {exportError && (
            <div style={{ color: "#f87171", fontSize: 12, padding: "10px", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
              Error: {exportError}
            </div>
          )}
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
    </div>
  );
}
