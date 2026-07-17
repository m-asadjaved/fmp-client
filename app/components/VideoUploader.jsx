'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Helper function to extract a frame from the video file at 1 second
const generateThumbnail = (videoFile, seekTime = 1) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 1 second (or halfway if the video is shorter)
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
        }, 'image/jpeg', 0.85); // 85% quality compressed JPEG
      } else {
        reject(new Error('Canvas context unavailable'));
      }
    };

    video.onerror = (err) => {
      reject(err);
    };
  });
};

export default function VideoUploader() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [history, setHistory] = useState([]);
  const [credits, setCredits] = useState(0);

  // Active video state for the playback modal
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const fileInputRef = useRef(null);

  const fetchUploadHistory = async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setCredits(data.credits ?? 0);
      }
    } catch (err) {
      console.error("Error retrieving dashboard data:", err);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUploadHistory();
    }
  }, [isSignedIn, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-lime-400 font-mono text-sm">
        Loading context initialization...
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lime-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-6">
        <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-lime-500/10 blur-3xl rounded-full"></div>

          <div className="w-16 h-16 bg-neutral-800 border border-neutral-700 text-lime-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h2>
          <p className="text-sm text-neutral-400 mt-2 max-w-sm mx-auto">
            Please sign in to unlock your personal workspace dashboard, upload high-quality video formats, and trace your project's upload history logs.
          </p>

          <div className="mt-8">
            <SignInButton mode="modal">
              <button className="bg-lime-500 hover:bg-lime-400 text-black font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-lime-500/20 text-sm">
                Sign In to Account
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

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

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile.type.startsWith('video/')) {
      alert('Please select a valid video file.');
      return;
    }

    const maxSize = 5 * 1024 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert('File size limit exceeded. Max allowed is 5GB.');
      return;
    }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(selectedFile);

    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);

      const estimatedCost = videoElement.duration / 1200;
      if (estimatedCost > credits) {
        alert(`Insufficient credit balance. This video requires ~${estimatedCost.toFixed(2)} credits, but you only have ${credits.toFixed(2)}.`);
        return;
      }

      setVideoDuration(videoElement.duration);
      setFile(selectedFile);
    };
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);
      setUploadSpeed('Generating thumbnail...');

      // 1. Generate the Client-side Thumbnail Image Blob
      let thumbnailBlob = null;
      try {
        thumbnailBlob = await generateThumbnail(file, 1);
      } catch (thumbErr) {
        console.error("Failed to extract thumbnail frame:", thumbErr);
      }

      setUploadSpeed('Calculating...');

      // 2. Request presigned upload keys from backend API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          duration: videoDuration,
          hasThumbnail: !!thumbnailBlob, // Let backend know whether to expect a thumbnail
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload error');

      const { uploadUrl, thumbnailUploadUrl, dbRecord } = data;

      // 3. Process the Thumbnail binary upload to S3 concurrently if URL exists
      if (thumbnailBlob && thumbnailUploadUrl) {
        fetch(thumbnailUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: thumbnailBlob,
        }).catch((err) => console.error("Async S3 Thumbnail upload execution error:", err));
      }

      // 4. Instantiate Main Production Video transmission pipeline via XHR
      const xhr = new XMLHttpRequest();
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

      xhr.onload = () => {
        if (xhr.status === 200) {
          alert('Asset parsed and recorded successfully!');
          setFile(null);
          setHistory((prev) => [dbRecord, ...prev]);
          fetchUploadHistory();
        } else {
          alert('Target storage bucket error.');
        }
        setUploading(false);
        setUploadSpeed('');
      };

      xhr.onerror = () => {
        alert('Network connection lost during S3 transmission.');
        setUploading(false);
        setUploadSpeed('');
      };

      xhr.send(file);

    } catch (error) {
      alert(error.message);
      setUploading(false);
      setUploadSpeed('');
    }
  };

  const handleMakeClips = (videoItem) => {
    router.push(`/dashboard/clips/${videoItem.video_id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 w-full">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* DASHBOARD HEADER & USAGE PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-6 gap-6 shadow-xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Creator Dashboard</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage, compress, and process your raw video workspace compositions.</p>
          </div>

          <div className="w-full md:w-72 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-neutral-400 font-medium">Available Balance</span>
              <span className="text-lime-400 font-bold font-mono text-sm">{credits.toFixed(2)} Credits</span>
            </div>

            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full transition-all duration-300 ${credits > 0 ? 'bg-lime-500 w-full' : 'bg-red-500 w-0'}`}
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              {credits <= 0 ? "Insufficient credits. Please upgrade your plan." : "Credits consumed based on asset duration."}
            </p>
          </div>
        </div>

        {/* INTERACTIVE WORKSPACE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT SECTION: ENHANCED UPLOADER WINDOW */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Upload Production Assets</h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && credits > 0 && fileInputRef.current.click()}
              className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ${credits <= 0
                ? 'border-neutral-800 bg-neutral-950/40 opacity-50 cursor-not-allowed'
                : isDragActive
                  ? 'border-lime-500 bg-lime-500/5 shadow-lg shadow-lime-500/5 cursor-pointer'
                  : 'border-neutral-700 bg-neutral-950/30 hover:border-lime-500/40 cursor-pointer'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                disabled={uploading || credits <= 0}
              />
              <div className="text-center px-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border ${isDragActive ? 'bg-lime-500/10 border-lime-400 text-lime-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {credits <= 0 ? (
                  <p className="text-sm text-neutral-400 font-medium">Your account credit balance has run out</p>
                ) : (
                  <>
                    <p className="mb-1 text-sm text-neutral-200">
                      <span className="font-semibold text-lime-400">Click to browse</span> or drag files right here
                    </p>
                    <p className="text-xs text-neutral-500">Max file restriction is 5GB</p>
                  </>
                )}
              </div>
            </div>

            {file && (
              <div className="mt-6 bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4 text-sm mb-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-neutral-200 font-medium truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{formatSize(file.size)}</p>
                  </div>
                  <span className="text-lime-400 font-mono text-xs bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-md flex-shrink-0">
                    Duration: {formatDuration(videoDuration)}
                  </span>
                </div>
                {!uploading && (
                  <button
                    onClick={handleUpload}
                    className="w-full bg-lime-500 hover:bg-lime-400 text-black font-bold py-2.5 px-4 rounded-xl transition-colors duration-200 shadow-md"
                  >
                    Confirm & Start Upload
                  </button>
                )}
              </div>
            )}

            {uploading && (
              <div className="mt-6 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <div className="flex justify-between text-xs font-semibold text-lime-400 mb-2.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
                    Uploading your video to our cloud storage.
                  </span>
                  <div className="flex gap-3 font-mono">
                    <span className="text-neutral-400">{uploadSpeed}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-lime-500 h-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SECTION: DOCK LOG LABELS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Uploaded History</h2>
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 bg-neutral-950/40 border border-neutral-800 border-dashed rounded-xl">
                <p className="text-xs text-neutral-500 italic max-w-[180px]">You haven't uploaded any videos yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div key={item.id} className="group flex flex-col p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all duration-200">

                    {/* Visual Media Thumbnail + Information Block */}
                    <div className="flex gap-3 items-start">
                      {/* Video Container rendering true fallback preview image if generated */}
                      <div
                        onClick={() => setActiveVideoUrl(item.video_url)}
                        className="relative w-20 h-14 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 cursor-pointer flex-shrink-0 group/thumb hover:border-lime-500/50 transition-colors flex items-center justify-center"
                      >
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt="extracted frame content"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.video_url}
                            preload="metadata"
                            muted
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        )}
                        {/* Play overlay button on hover */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-lime-400 drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Video Title Details */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between h-14">
                        <span
                          onClick={() => setActiveVideoUrl(item.video_url)}
                          className="text-xs font-medium text-white truncate group-hover:text-lime-400 transition-colors cursor-pointer block"
                        >
                          {item.original_name}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-400 font-mono bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700/50">
                            {formatDuration(item.duration)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Make AI Clips Action Button Row */}
                    <div className="mt-3">
                      <button
                        onClick={() => handleMakeClips(item)}
                        className="w-full bg-neutral-900 hover:bg-lime-500 border border-neutral-800 hover:border-lime-500 text-white hover:text-black font-semibold py-1.5 px-3 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.473L21 9l-3.414-3.414m-1.393 1.393L3 17v4h4l10.586-10.586m-1.393-1.393a2 2 0 112.828-2.828L17.586 4.414z" />
                        </svg>
                        Make AI Clips
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span>Key: {item.file_key ? item.file_key.substring(0, 8) : 'N/A'}...</span>
                      <span className="text-lime-500 font-medium">Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* POPUP VIDEO PLAYBACK MODAL */}
      {activeVideoUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveVideoUrl(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Dismiss Bar */}
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <span className="text-xs font-mono text-neutral-400">Media Workspace Player</span>
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="text-neutral-400 hover:text-white transition-colors text-sm font-semibold px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
              >
                Close ✕
              </button>
            </div>
            {/* Native HTML5 Player */}
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}