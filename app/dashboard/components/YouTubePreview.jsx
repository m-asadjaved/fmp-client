"use client";
import React, { useEffect, useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

export function YouTubePreview({ videoId, onRangeChange, onCancel }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTitle, setVideoTitle] = useState("");
  const [channelName, setChannelName] = useState("");
  const [views, setViews] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [publishDate, setPublishDate] = useState(null);
  const [subscribers, setSubscribers] = useState(null);

  useEffect(() => {
    // Reset state on video ID change
    setDuration(0);
    setStartTime(0);
    setEndTime(100);
    setIsReady(false);
    
    // Fetch extended video info (views, avatar)
    if (videoId) {
      fetch(`/api/youtube/info?videoId=${videoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.views) setViews(data.views);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
          if (data.publishDate) setPublishDate(data.publishDate);
          if (data.channelName) setChannelName(data.channelName);
          if (data.subscribers) setSubscribers(data.subscribers);
        })
        .catch(console.error);
    }
    
    // Load Iframe API if not loaded
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      tag.id = "youtube-iframe-api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const initPlayer = () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          cc_load_policy: 0
        },
        events: {
          onReady: (event) => {
            const total = event.target.getDuration();
            let title = "";
            let author = "";
            try {
              title = event.target.getVideoData().title;
              author = event.target.getVideoData().author;
            } catch(e) {}
            setVideoTitle(title);
            setChannelName(author);
            setDuration(total);
            setEndTime(total);
            setIsReady(true);
            if (onRangeChange) {
              onRangeChange({ startTime: 0, endTime: total });
            }
            // Explicitly force unload of captions in case user preferences turn them on
            try {
              event.target.unloadModule("captions");
              event.target.unloadModule("cc");
            } catch (err) { /* ignore */ }
            event.target.playVideo();
          },
          onStateChange: (event) => {
            // YT.PlayerState.PLAYING == 1, PAUSED == 2, ENDED == 0
            if (event.data === 1) setIsPlaying(true);
            if (event.data === 2) setIsPlaying(false);
            if (event.data === 0) {
              event.target.playVideo(); // Loop
            }
          }
        }
      });
    };

    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkYT);
        if (containerRef.current) {
          initPlayer();
        }
      }
    }, 100);

    return () => {
      clearInterval(checkYT);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // When sliders change, we seek the video
  const handleStartChange = (e) => {
    const val = parseFloat(e.target.value);
    if (val >= endTime - 1) return; // Prevent crossing or being too close
    setStartTime(val);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(val, true);
      playerRef.current.playVideo();
    }
    if (onRangeChange) onRangeChange({ startTime: val, endTime });
  };

  const handleEndChange = (e) => {
    const val = parseFloat(e.target.value);
    if (val <= startTime + 1) return; // Prevent crossing or being too close
    setEndTime(val);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(val, true);
      playerRef.current.playVideo();
    }
    if (onRangeChange) onRangeChange({ startTime, endTime: val });
  };

  const togglePlay = () => {
    if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
      const state = playerRef.current.getPlayerState();
      if (state === 1) { // playing
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num) => {
    if (!num) return "";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 600px) 1fr", gap: 32, width: "100%", alignItems: "stretch" }}>
      {/* Video Container (16:9 Aspect Ratio) */}
      <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-subtle)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", background: "#000" }}>
        <div 
          style={{ position: "relative", width: "100%", paddingTop: "56.25%", cursor: isReady ? "pointer" : "default" }}
          onClick={isReady ? togglePlay : undefined}
        >
          {/* pointerEvents: none disables all clicking on the iframe directly, letting our wrapper catch the click */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
          </div>
          
          {/* Play/Pause Overlay Indicator */}
          {isReady && (
            <div style={{ 
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: 64, height: 64, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: isPlaying ? 0 : 1, transition: "opacity 0.2s", pointerEvents: "none", zIndex: 3,
              backdropFilter: "blur(4px)"
            }}>
              <Play fill="#fff" color="#fff" size={32} style={{ marginLeft: 4 }} />
            </div>
          )}
          
          {/* Loading overlay if not ready */}
          {!isReady && (
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#fff", zIndex: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, animation: "pulse 1.5s infinite" }}>Loading Player...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Footer (Title & Process Button) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
        <div>
          {videoTitle ? (
            <h4 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: "var(--on-surface)", lineHeight: 1.2, letterSpacing: "-0.02em" }} title={videoTitle}>
              {videoTitle}
            </h4>
          ) : (
            <div className="animate-pulse" style={{ height: 28, background: "#e5e7eb", borderRadius: 6, marginBottom: 12, width: "80%" }} />
          )}
          
          <div style={{ fontSize: 14, color: "var(--on-surface-variant)", marginBottom: 20, fontWeight: 500 }}>
            {views || publishDate ? (
              <>{views ? `${formatNumber(views)} views` : ""} {views && publishDate ? "•" : ""} {publishDate ? formatDate(publishDate) : ""}</>
            ) : (
              <div className="animate-pulse" style={{ height: 16, background: "#e5e7eb", borderRadius: 4, width: "40%" }} />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Channel" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div className="animate-pulse" style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {channelName ? (
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", lineHeight: 1.2 }}>
                  {channelName}
                </span>
              ) : (
                <div className="animate-pulse" style={{ height: 18, background: "#e5e7eb", borderRadius: 4, width: 120 }} />
              )}
              {subscribers ? (
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1 }}>
                  {subscribers}
                </span>
              ) : (
                <div className="animate-pulse" style={{ height: 14, background: "#e5e7eb", borderRadius: 4, width: 80 }} />
              )}
            </div>
          </div>

          <div style={{ fontSize: 13, display: "flex", gap: 12 }}>
            {duration ? (
              <span style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                Duration: {formatTime(duration)}
              </span>
            ) : (
              <div className="animate-pulse" style={{ height: 26, background: "#e5e7eb", borderRadius: 6, width: 100 }} />
            )}
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 12, marginTop: "auto", justifyContent: "flex-end", paddingBottom: "4px" }}>
          {onCancel && (
            <button 
              onClick={onCancel}
              style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 700, borderRadius: 12, background: "var(--surface-bg)", border: "1px solid #d1d5db", color: "var(--on-surface-variant)", cursor: "pointer", transition: "background 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = "#f3f4f6"}
              onMouseOut={e => e.currentTarget.style.background = "var(--surface-bg)"}
            >
              Cancel
            </button>
          )}
          <button 
            className="bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-[1px] transition-all duration-200 active:scale-[0.98]"
            style={{ padding: "12px 24px", fontSize: "14px", border: "none", cursor: "pointer" }}
          >
            Generate Clips
          </button>
        </div>
      </div>
    </div>
  );
}
