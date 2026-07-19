'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth, SignInButton, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAlert } from '@/contexts/AlertContext';
import { useUpload } from '@/contexts/UploadContext';
import {
  Bell,
  Cloud,
  Hourglass,
  Video,
  UploadCloud,
  Loader2,
  ArrowRight,
  Sparkles,
  Lock,
  Play,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

// ─── Platform colour/icon map ─────────────────────────────────────────────────
const PLATFORM_META = {
  YouTube: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', emoji: '▶️' },
  TikTok: { color: '#f9fafb', bg: '#f4f4f5', border: '#e4e4e7', emoji: '🎵' },
  'Instagram Reels': { color: '#e11d74', bg: '#fff1f7', border: '#fbcfe8', emoji: '📸' },
};
const DEFAULT_PLATFORM_META = { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', emoji: '🎬' };

// ─── Single post-completion alert banner ─────────────────────────────────────
function PostJobAlert({ job, onDismiss }) {
  // Extract platforms. Fallback to a single platform if it's the old schema
  const platforms = Array.isArray(job.platforms) ? job.platforms : (job.platform ? [job.platform] : []);

  // Use the first platform's styling as the base theme for the card
  const mainPlat = platforms.length > 0 ? platforms[0] : null;
  const meta = PLATFORM_META[mainPlat] || DEFAULT_PLATFORM_META;

  const platformNames = platforms.length > 0 ? platforms.join(', ') : 'Unknown Platform';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 14, padding: '16px 18px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        animation: 'slideDown 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: meta.color, borderRadius: '14px 0 0 14px'
      }} />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${meta.color}18`, border: `1px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {meta.emoji}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <CheckCircle2 size={14} color={meta.color} />
          <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {job.scheduled_for ? 'Post Scheduled' : 'Post Ready'}
          </span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb', margin: 0, lineHeight: 1.4 }}>
          {job.scheduled_for ? `Your video is scheduled for ${platformNames}!` : `Your video is live-ready on ${platformNames}!`}
        </p>
        <p style={{ fontSize: 12, color: "var(--on-surface-variant)", margin: '3px 0 10px', lineHeight: 1.5 }}>
          {job.scheduled_for
            ? `It will automatically publish at ${new Date(job.scheduled_for).toLocaleString()}.`
            : `Rendering complete. Download your clip and upload it to publish.`}
        </p>
        {job.output_url && !job.scheduled_for && (
          <a
            href={job.output_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: meta.color, color: '#fff',
              fontSize: 12, fontWeight: 700,
              padding: '6px 14px', borderRadius: 8,
              textDecoration: 'none', transition: 'opacity 0.15s'
            }}
          >
            <ExternalLink size={12} /> Download &amp; Publish
          </a>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(job.id)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: "var(--on-surface-variant)", padding: 4, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}

// Helper function to extract a frame from the video file at 1 second
const generateThumbnail = (videoFile, seekTime = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(seekTime, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, 'image/jpeg', 0.85);
      } else {
        reject(new Error('Canvas context unavailable'));
      }
    };

    video.onerror = (err) => {
      reject(err);
    };
  });
};

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { pendingFile, setPendingFile } = useUpload();

  // ─── Post job notifications ──────────────────────────────────────────────────
  const [postAlerts, setPostAlerts] = useState([]);  // completed jobs to display
  const pollIntervalRef = useRef(null);

  // Dismiss a completed-job alert and acknowledge it in the DB
  const dismissAlert = useCallback(async (jobId) => {
    setPostAlerts(prev => prev.filter(j => j.id !== jobId));
    try {
      await fetch('/api/export/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
    } catch (err) {
      console.error('Failed to acknowledge job:', err);
    }
  }, []);

  // On mount: fetch any already-completed, unacknowledged jobs
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/export/notifications')
      .then(r => r.json())
      .then(({ jobs }) => {
        if (jobs?.length) setPostAlerts(prev => [
          ...prev,
          ...jobs.filter(j => !prev.some(p => p.id === j.id))
        ]);
      })
      .catch(err => console.error('Notifications fetch error:', err));
  }, [isSignedIn]);

  // Poll for in-progress jobs every 8 seconds
  useEffect(() => {
    if (!isSignedIn) return;

    const poll = async () => {
      try {
        const res = await fetch('/api/export/poll');
        const { jobs } = await res.json();
        if (!jobs) return;
        const justCompleted = jobs.filter(j => j.status === 'completed');
        if (justCompleted.length > 0) {
          setPostAlerts(prev => [
            ...justCompleted.filter(j => !prev.some(p => p.id === j.id)),
            ...prev,
          ]);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    // First call immediately, then on interval
    poll();
    pollIntervalRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollIntervalRef.current);
  }, [isSignedIn]);

  // Navigation UI State
  const [videoLink, setVideoLink] = useState('');

  // S3 Core Pipeline Upload & Media Tracking States
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [compressionStatuses, setCompressionStatuses] = useState({});

  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);
  const abortControllerRef = useRef(null);
  const compressionStatusesRef = useRef({});

  useEffect(() => {
    if (!isSignedIn || history.length === 0) return;

    const checkStatuses = async () => {
      const currentStatuses = compressionStatusesRef.current;
      const keysToCheck = history
        .slice(0, 10)
        .map(item => item.file_key)
        .filter(key => currentStatuses[key] !== 'ready');

      if (keysToCheck.length === 0) return;

      try {
        const res = await fetch('/api/upload/compression-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKeys: keysToCheck })
        });
        if (res.ok) {
          const { statuses } = await res.json();
          let changed = false;
          const newStatuses = { ...currentStatuses };
          for (const key in statuses) {
            if (newStatuses[key] !== statuses[key]) {
              newStatuses[key] = statuses[key];
              changed = true;
            }
          }
          if (changed) {
            compressionStatusesRef.current = newStatuses;
            setCompressionStatuses(newStatuses);
          }
        }
      } catch (err) {
        console.error("Failed to fetch compression statuses", err);
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 8000);
    return () => clearInterval(interval);
  }, [isSignedIn, history]);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setFile(null);
    setUploading(false);
    setProgress(0);
    setUploadSpeed('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch upload ledger history logs
  const fetchUploadHistory = async () => {
    if (!isSignedIn) return;
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Error retrieving dashboard data:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUploadHistory();

      // Fetch user notifications list
      fetch('/api/user/notifications')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setNotifications(data.notifications || []);
        })
        .catch(err => console.error("Error fetching notifications:", err));
    }
  }, [isSignedIn, isLoaded]);

  // Format Helper Methods
  const formatDuration = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Event Handlers
  const handleFileSelection = (selectedFile) => {
    if (!selectedFile.type.startsWith('video/')) {
      showAlert('Invalid File', 'Please select a valid video file.', 'error');
      return;
    }

    const maxSize = 1 * 1024 * 1024 * 1024; // 1GB Limit
    if (selectedFile.size > maxSize) {
      showAlert('File Too Large', 'File size limit exceeded. Max allowed is 1GB for direct uploads.', 'warning');
      return;
    }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(selectedFile);

    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);

      const maxDuration = 30 * 60; // 30 minutes in seconds
      if (videoElement.duration > maxDuration) {
        showAlert('Video Too Long', 'Video duration limit exceeded. Max allowed is 30 minutes for direct uploads.', 'warning');
        return;
      }

      setVideoDuration(videoElement.duration);
      setFile(selectedFile);
    };
  };

  useEffect(() => {
    if (pendingFile && !uploading && !file) {
      handleFileSelection(pendingFile);
      setPendingFile(null);
    }
  }, [pendingFile, uploading, file]);

  const handleUpload = async () => {
    if (!file) return;

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      setUploading(true);
      setProgress(0);
      setUploadSpeed('Generating thumbnail...');

      let thumbnailBlob = null;
      try {
        thumbnailBlob = await generateThumbnail(file, 1);
      } catch (thumbErr) {
        console.error("Failed to extract thumbnail frame:", thumbErr);
      }

      if (signal.aborted) return;

      setUploadSpeed('Calculating...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          duration: videoDuration,
          hasThumbnail: !!thumbnailBlob,
        }),
        signal,
      });

      const data = await response.json();
      if (signal.aborted) return;
      if (!response.ok) throw new Error(data.error || 'Upload error');

      const { uploadUrl, thumbnailUploadUrl, dbRecord } = data;

      if (thumbnailBlob && thumbnailUploadUrl) {
        fetch(thumbnailUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: thumbnailBlob,
        }).catch((err) => console.error("Async S3 Thumbnail upload execution error:", err));
      }

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentProgress = Math.round((event.loaded / event.total) * 100);
          setProgress(currentProgress);

          const timeElapsed = (Date.now() - startTime) / 1000;
          if (timeElapsed > 0) {
            const bytesPerSecond = event.loaded / timeElapsed;
            if (bytesPerSecond >= 1024 * 1024) {
              setUploadSpeed(`${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`);
            } else {
              setUploadSpeed(`${(bytesPerSecond / 1024).toFixed(2)} KB/s`);
            }
          }
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          showAlert('Upload Successful', 'Asset parsed and recorded successfully!', 'success');

          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setHistory((prev) => [dbRecord, ...prev]);
          fetchUploadHistory();
        } else {
          showAlert('Upload Error', 'Target storage bucket error.', 'error');
        }
        setUploading(false);
        setUploadSpeed('');
        xhrRef.current = null;
      };

      xhr.onerror = () => {
        showAlert('Connection Lost', 'Network connection lost during S3 transmission.', 'error');
        setUploading(false);
        setUploadSpeed('');
        xhrRef.current = null;
      };

      xhr.onabort = () => {
        // Handled by handleCancelUpload directly
        xhrRef.current = null;
      };

      xhr.send(file);

    } catch (error) {
      if (error.name === 'AbortError') {
        // Upload was cancelled, state is already reset by handleCancelUpload
        return;
      }
      showAlert('Error', error.message, 'error');
      setUploading(false);
      setUploadSpeed('');
      xhrRef.current = null;
    }
  };

  const handleMakeClips = (videoItem) => {
    router.push(`/dashboard/clips/v2/${videoItem.video_id}`);
  };

  // Auth Gate 1: App Loading Screen
  if (!isLoaded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--surface-bg)", color: "var(--primary)", fontFamily: "'Inter', sans-serif" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.05em", color: "var(--on-surface-variant)" }}>Initializing system context...</span>
      </div>
    );
  }

  // Auth Gate 2: Access Control Restricted Screen (Matches Design Tokens)
  if (!isSignedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--surface-bg)", padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", position: "relative", overflow: "hidden" }}>

          <div style={{ width: 56, height: 56, background: "color-mix(in srgb, var(--primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--on-surface)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>Access Restricted</h2>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: 0, lineHeight: 1.5 }}>
            Please sign in to unlock your custom creator dashboard, process raw video workspace formats, and analyze project clips.
          </p>

          <div style={{ marginTop: 32 }}>
            <SignInButton mode="modal">
              <button style={{ background: "linear-gradient(135deg, #0F2347, #00C0D4)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 8, fontSize: 14, border: "none", cursor: "pointer", width: "100%", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = 0.9} onMouseOut={e => e.currentTarget.style.opacity = 1}>
                Sign In to Account
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── STYLE BLOCK for animations ──────────────────────────────────────── */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>

      {/* ─── POST JOB ALERT BANNERS (fixed top-right) ────────────────────────── */}
      {postAlerts.length > 0 && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 12,
          width: 380, maxWidth: 'calc(100vw - 40px)',
        }}>
          {postAlerts.map(job => (
            <PostJobAlert key={job.id} job={job} onDismiss={dismissAlert} />
          ))}
        </div>
      )}

      {/* DASHBOARD GRID CONTENT */}
      <main className="bg-dot-pattern" style={{ flex: 1, padding: "32px 40px", overflowY: "auto", backgroundColor: "var(--surface-bg)" }}>



        {/* METRICS HAVE BEEN MOVED TO DASHBOARD HEADER */}

        {/* CREATION HUB & DRAG DROP WORKSPACE */}
        <section className="stagger-1 shadow-sm hover:shadow-md transition-shadow duration-300" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32, background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 32, marginBottom: 32, alignItems: "center" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 className="text-gradient-primary" style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Create New Project</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.5, maxWidth: 500 }}>
                Transform long production footage into highly engaging vertical highlights using our integrated AI transcription models.
              </p>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "#c4b5fd", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, width: "fit-content", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
              <Sparkles size={14} style={{ color: "var(--primary)" }} />
              <span>Powered by ClipAI Turbo</span>
            </div>

            <div style={{ marginTop: 8, opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", margin: 0 }}>Paste Youtube URL</label>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)", padding: "2px 8px", borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Coming Soon</span>
              </div>
              <div style={{ display: "flex", gap: 8, maxWidth: 500 }}>
                <input
                  type="text"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="YouTube URL integration is currently under construction"
                  disabled
                  style={{ flex: 1, background: "#f3f4f6", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", color: "var(--on-surface-variant)", fontSize: 14, outline: "none", cursor: "not-allowed" }}
                />
                <button disabled style={{ background: "#9ca3af", color: "#fff", border: "none", borderRadius: 8, padding: "0 20px", fontSize: 14, fontWeight: 600, cursor: "not-allowed" }}>
                  Get Clips Now
                </button>
              </div>
              <div style={{ marginTop: "12px", background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🎁</span>
                <p style={{ margin: 0, fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--primary)" }}>Bonus:</strong> Until YouTube link integration arrives, we've temporarily increased direct file upload limits to <strong>1 Hour</strong> and <strong>3 GB</strong>!
                </p>
              </div>
            </div>
          </div>

          <div style={{ height: "100%", minHeight: 180 }}>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              disabled={uploading}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && fileInputRef.current.click()}
              style={{
                height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                background: isDragActive ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "var(--surface-bg)",
                border: `2px dashed ${isDragActive ? "var(--primary)" : "var(--border-subtle)"}`,
                borderRadius: 16, cursor: "pointer",
                padding: 24, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isDragActive ? "scale(1.02)" : "scale(1)"
              }}
              onMouseOver={e => { 
                if (!isDragActive) {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-ambient)";
                } 
              }}
              onMouseOut={e => { 
                if (!isDragActive) {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <div style={{ background: "var(--surface)", padding: 12, borderRadius: "50%", color: "var(--on-surface-variant)", marginBottom: 12, border: "1px solid var(--border-subtle)" }}>
                <UploadCloud size={24} />
              </div>

              <>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--on-surface)" }}>Upload Video Asset</p>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--on-surface-variant)" }}>
                  Drag & drop or <span style={{ color: "var(--primary)", fontWeight: 600 }}>browse files</span>
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)", padding: "2px 8px", borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.05em", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                  Upgraded: 3GB • 1 Hour
                </span>
              </>
            </div>
          </div>
        </section>

        {/* PERSISTENT LIVE UPLOAD PIPELINE TRANSMISSION MONITOR CARD */}
        {file && (
          <section style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: uploading ? 16 : 0 }}>
              <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ fontSize: 10, fontWeight: 800, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "#c4b5fd", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Staged Composition</span>
                <h4 style={{ margin: "8px 0 4px", fontSize: 14, fontWeight: 700, color: "var(--on-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</h4>
                <p style={{ margin: 0, fontSize: 12, color: "var(--on-surface-variant)" }}>{formatSize(file.size)} • Duration: {formatDuration(videoDuration)}</p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleCancelUpload}
                  style={{ background: "var(--surface)", color: "var(--on-surface-variant)", border: "1px solid var(--border-subtle)", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseOut={e => e.currentTarget.style.background = "#ffffff"}
                >
                  Cancel
                </button>
                {!uploading && (
                  <button
                    onClick={handleUpload}
                    style={{ background: "#0F2347", color: "#f9fafb", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                  >
                    Confirm & Start Upload
                  </button>
                )}
              </div>
            </div>

            {uploading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C0D4", animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                    Transmitting binary stream to secure storage node...
                  </span>
                  <div style={{ display: "flex", gap: 16, fontFamily: "monospace", color: "var(--on-surface-variant)" }}>
                    <span>{uploadSpeed}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>{progress}%</span>
                  </div>
                </div>
                <div style={{ width: "100%", background: "var(--surface-bg)", height: 6, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#00C0D4", height: "100%", transition: "width 0.15s", width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* RECENT REPOSITORIES MEDIA CARD LAYOUT */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: "0", fontSize: 18, fontWeight: 800, color: "var(--on-surface)" }}>Recent Clips History</h3>
              <span style={{ background: "#e5e7eb", color: "var(--on-surface-variant)", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 12 }}>
                {loadingHistory ? "..." : `${history.length} Total Projects`}
              </span>
            </div>
            <button style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              View All <ArrowRight size={16} />
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ aspectRatio: "16/9", background: "#e5e7eb", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                  <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ height: 16, width: "80%", background: "#e5e7eb", borderRadius: 4, marginBottom: 8, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                      <div style={{ height: 12, width: "40%", background: "#e5e7eb", borderRadius: 4, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                    </div>
                    <div style={{ height: 28, width: "100%", background: "#e5e7eb", borderRadius: 6, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{ background: "var(--surface-bg)", border: "1px dashed var(--border-subtle)", borderRadius: 16, padding: 64, textAlign: "center" }}>
              <Video size={36} style={{ color: "#d1d5db", marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--on-surface-variant)", fontStyle: "italic" }}>No video logs recorded. Upload a project to begin.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
              {history.map((item, index) => {
                const isReady = compressionStatuses[item.file_key] === 'ready';
                const isProcessing = compressionStatuses[item.file_key] === 'processing';

                return (
                  <div key={item.id || item.video_id} className={`stagger-${(index % 3) + 1} group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-400`} style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                    {/* Aspect Previews Area box */}
                    <div
                      onClick={() => { if (isReady) setActiveVideoUrl(item.video_url) }}
                      style={{ position: "relative", aspectRatio: "16/9", background: "#000", cursor: isReady ? "pointer" : "default", overflow: "hidden" }}
                    >
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt="extracted frame content"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-bg)" }}>
                          <Video size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
                        </div>
                      )}

                      <span className="absolute bottom-2 right-2 backdrop-blur-md bg-black/60 text-white font-mono text-[10px] px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
                        {formatDuration(item.duration)}
                      </span>

                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full text-gray-900 shadow-lg transform scale-95 group-hover:scale-100 transition-all duration-300">
                          <Play size={18} fill="currentColor" />
                        </div>
                      </div>

                      {!isReady && isProcessing && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                          <Loader2 size={24} style={{ color: "var(--primary)", animation: "spin 1s linear infinite", marginBottom: 8 }} />
                          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Compressing...</span>
                        </div>
                      )}
                    </div>

                    {/* Operational Information Meta Segment */}
                    <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ marginBottom: 16 }}>
                        <h4
                          onClick={() => setActiveVideoUrl(item.video_url)}
                          style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--on-surface)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {item.original_name || 'Untitled Clip Asset'}
                        </h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--on-surface-variant)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Key: {item.file_key ? item.file_key.substring(0, 8) : 'Pending'}
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          disabled={!isReady}
                          onClick={() => handleMakeClips(item)}
                          className={`w-full py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${isReady ? 'bg-gradient-to-r from-[var(--primary)] to-indigo-500 hover:from-[var(--primary-hover)] hover:to-indigo-600 text-white shadow-md hover:shadow-lg active:scale-[0.98]' : 'bg-[var(--border-subtle)] text-[var(--on-surface-variant)] cursor-not-allowed'}`}
                        >
                          <Sparkles size={14} />
                          Make AI Clips
                        </button>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "var(--on-surface-variant)", fontFamily: "monospace", paddingTop: 4 }}>
                          <span>Node status:</span>
                          <span style={{ color: isReady ? "#4ade80" : "#facc15", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {isReady ? "Ready" : "Processing"}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--on-surface-variant)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "var(--on-surface)" }}>ClipAI</span>
            <span>© 2026 ClipAI Inc. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="#" style={{ color: "var(--on-surface-variant)", textDecoration: "none" }}>Privacy Policy</a>
            <a href="#" style={{ color: "var(--on-surface-variant)", textDecoration: "none" }}>Terms of Service</a>
          </div>
        </footer>

      </main>

      {/* POPUP NATIVE VIDEO PLAYBACK MODAL WINDOW OVERLAY */}
      {activeVideoUrl && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setActiveVideoUrl(null)}
        >
          <div
            style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, width: "100%", maxWidth: 800, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Navigation Control Header bar */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-bg)" }}>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--on-surface-variant)", fontWeight: 600 }}>Media Workspace Player</span>
              <button
                onClick={() => setActiveVideoUrl(null)}
                style={{ background: "#e5e7eb", border: "1px solid var(--border-subtle)", color: "var(--on-surface-variant)", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 6, transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "#fff"}
                onMouseOut={e => e.currentTarget.style.color = "#4b5563"}
              >
                Close ✕
              </button>
            </div>

            {/* Render Context Viewport screen */}
            <div style={{ aspectRatio: "16/9", width: "100%", background: "#000", display: "flex", alignItems: "center", justifyItems: "center" }}>
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", maxHeight: "70vh" }}
              />
            </div>
          </div>
        </div>
      )}

    </>
  );
}