"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function VideoTimelineScrubber({ videoRef, duration, trimRange, onChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const trackRef = useRef(null);

  // Sync with video play state
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Auto pause if it hits the end of trim range while playing
      if (video.currentTime >= trimRange[1] && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef, trimRange]);

  const togglePlay = () => {
    const video = videoRef?.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime >= trimRange[1] || video.currentTime < trimRange[0]) {
        video.currentTime = trimRange[0];
      }
      video.play();
    } else {
      video.pause();
    }
  };

  const getPosFromEvent = (e) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    let pos = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, pos));
  };

  const [dragging, setDragging] = useState(null); // 'start', 'end', 'playhead', or 'track'
  const dragOffsetRef = useRef(0);

  const handlePointerDown = (e, type) => {
    e.preventDefault();
    setDragging(type);
    
    // Pause video when dragging starts
    if (videoRef?.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    if (type === 'track') {
      const pos = getPosFromEvent(e);
      const currentStartPos = trimRange[0] / duration;
      dragOffsetRef.current = pos - currentStartPos;
    }
    
    // If clicking on track directly, move playhead
    if (type === 'playhead_jump') {
      const pos = getPosFromEvent(e);
      let newTime = pos * duration;
      // Clamp playhead between handles
      newTime = Math.max(trimRange[0], Math.min(trimRange[1], newTime));
      
      if (videoRef?.current) videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setDragging('playhead');
    }
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !trackRef.current) return;
    
    const pos = getPosFromEvent(e);
    let newTime = pos * duration;

    // Calculate minimum time gap. Ensure at least 60 seconds (1 minute) OR the physical width of the handles.
    const rect = trackRef.current.getBoundingClientRect();
    const handleWidthTime = (32 / rect.width) * duration;
    const minGapTime = Math.max(60, handleWidthTime);

    if (dragging === 'start') {
      const nextStart = Math.min(newTime, trimRange[1] - minGapTime);
      onChange([nextStart, trimRange[1]]);
      if (videoRef?.current) {
        videoRef.current.currentTime = nextStart;
      }
      // Force playhead to follow the dragged handle
      setCurrentTime(nextStart);
    } else if (dragging === 'end') {
      const nextEnd = Math.max(newTime, trimRange[0] + minGapTime);
      onChange([trimRange[0], nextEnd]);
      if (videoRef?.current) {
        videoRef.current.currentTime = nextEnd;
      }
      // Force playhead to follow the dragged handle
      setCurrentTime(nextEnd);
    } else if (dragging === 'playhead') {
      // Clamp playhead strictly between trim boundaries
      newTime = Math.max(trimRange[0], Math.min(trimRange[1], newTime));
      if (videoRef?.current) {
        videoRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    } else if (dragging === 'track') {
      let newStartPos = pos - dragOffsetRef.current;
      const rangeDuration = trimRange[1] - trimRange[0];
      const rangePercent = rangeDuration / duration;
      
      if (newStartPos < 0) newStartPos = 0;
      if (newStartPos + rangePercent > 1) newStartPos = 1 - rangePercent;
      
      const nextStart = newStartPos * duration;
      const nextEnd = nextStart + rangeDuration;
      
      onChange([nextStart, nextEnd]);
      if (videoRef?.current) {
        videoRef.current.currentTime = nextStart;
      }
      setCurrentTime(nextStart);
    }
  }, [dragging, duration, trimRange, onChange, videoRef, currentTime]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove, { passive: false });
      window.addEventListener("touchend", handlePointerUp);
      return () => {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseup", handlePointerUp);
        window.removeEventListener("touchmove", handlePointerMove);
        window.removeEventListener("touchend", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  const startPercent = (trimRange[0] / duration) * 100;
  const endPercent = (trimRange[1] / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <div className="w-full flex flex-col gap-3 mt-4 select-none animate-fadeIn">
      <div className="flex flex-col gap-1 mb-1">
        <h4 className="text-sm font-bold text-[#0F2347]">Select Processing Range</h4>
        <p className="text-[11px] text-[#4b5563]">Select the timeline segment of the video you want to process.</p>
      </div>
      <div className="flex items-center justify-between text-xs font-semibold text-[#4b5563]">
        <div className="flex items-center gap-3">
          <button 
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0F2347] text-white hover:bg-[#1e3a8a] transition-colors shadow-sm"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <div className="bg-[#00C0D4]/10 text-[#00C0D4] px-2.5 py-1 rounded font-bold border border-[#00C0D4]/20">
          Selected: {formatTime(trimRange[1] - trimRange[0])}
        </div>
      </div>

      <div className="relative h-14 w-full rounded-lg bg-[#f3f4f6] border border-[#d1d5db] overflow-hidden shadow-inner" ref={trackRef}>
        {/* Fake timeline tick marks background */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none" 
          style={{ 
            backgroundImage: "linear-gradient(90deg, #9ca3af 1px, transparent 1px)", 
            backgroundSize: "20px 100%" 
          }} 
        />
        
        {/* Unselected left mask */}
        <div 
          className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none"
          style={{ width: `${startPercent}%` }}
        />
        
        {/* Selected region track */}
        <div 
          className="absolute top-0 bottom-0 bg-[#00C0D4]/20 border-y-2 border-[#00C0D4] z-10 cursor-grab active:cursor-grabbing touch-none"
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
          onMouseDown={(e) => handlePointerDown(e, 'track')}
          onTouchStart={(e) => handlePointerDown(e, 'track')}
        />

        {/* Unselected right mask */}
        <div 
          className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Left Handle */}
        <div 
          className="absolute top-0 bottom-0 w-4 bg-[#00C0D4] cursor-ew-resize hover:bg-[#00a8b9] flex items-center justify-center z-10 touch-none shadow-[2px_0_4px_rgba(0,0,0,0.2)] transition-colors"
          style={{ left: `${startPercent}%` }}
          onMouseDown={(e) => handlePointerDown(e, 'start')}
          onTouchStart={(e) => handlePointerDown(e, 'start')}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>

        {/* Right Handle */}
        <div 
          className="absolute top-0 bottom-0 w-4 bg-[#00C0D4] cursor-ew-resize hover:bg-[#00a8b9] flex items-center justify-center z-10 touch-none shadow-[-2px_0_4px_rgba(0,0,0,0.2)] transition-colors"
          style={{ left: `${endPercent}%`, transform: 'translateX(-100%)' }}
          onMouseDown={(e) => handlePointerDown(e, 'end')}
          onTouchStart={(e) => handlePointerDown(e, 'end')}
        >
          <div className="w-0.5 h-4 bg-white rounded-full" />
        </div>

        {/* Clickable track for seeking */}
        <div 
          className="absolute inset-0 z-0 cursor-pointer"
          onMouseDown={(e) => handlePointerDown(e, 'playhead_jump')}
          onTouchStart={(e) => handlePointerDown(e, 'playhead_jump')}
        />

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[#ef4444] z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          style={{ left: `${currentPercent}%` }}
        >
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#ef4444] rounded-b-sm pointer-events-auto cursor-ew-resize"
            onMouseDown={(e) => handlePointerDown(e, 'playhead')}
            onTouchStart={(e) => handlePointerDown(e, 'playhead')}
          />
        </div>
      </div>
      <div className="text-[11px] font-medium text-[#6b7280] text-center mt-1">
        Drag the <span className="text-[#00C0D4] font-bold">blue handles</span> to trim the section of the video you want to process.
      </div>
    </div>
  );
}
