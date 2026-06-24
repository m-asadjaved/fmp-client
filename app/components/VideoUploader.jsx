'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, SignInButton } from '@clerk/nextjs';

export default function VideoUploader() {
  const { isSignedIn, isLoaded } = useAuth();
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [history, setHistory] = useState([]);

  const fileInputRef = useRef(null);

  const fetchUploadHistory = async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Error retrieving database entries:", err);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUploadHistory();
    }
  }, [isSignedIn, isLoaded]);

  // Loading protection state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-lime-400 font-mono text-sm">
        Loading context initialization...
      </div>
    );
  }

  // UI view when user is NOT logged in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-6">
        <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          {/* Lime Green Accent Glow */}
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

  // Formatting helpers
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

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      alert('File size limit exceeded. Max allowed is 500MB.');
      return;
    }

    if (history.length >= 3) {
      alert('Account limit reached. You can upload a maximum of 3 video items.');
      return;
    }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(selectedFile);
    
    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);
      setVideoDuration(videoElement.duration);
      setFile(selectedFile);
    };
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);
      setUploadSpeed('Calculating...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          duration: videoDuration,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload error');

      const { uploadUrl, dbRecord } = data;

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentProgress = Math.round((event.loaded / event.total) * 100);
          setProgress(currentProgress);
          
          // Calculate speed metrics
          const timeElapsed = (Date.now() - startTime) / 1000; // seconds
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
    alert(`Initializing AI clip generation pipeline for: ${videoItem.original_name}\nSource URL: ${videoItem.video_url}`);
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
          
          {/* Usage Limit Tracking Card */}
          <div className="w-full md:w-72 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-neutral-400 font-medium">Free Tier Usage Limit</span>
              <span className="text-lime-400 font-bold font-mono">{history.length} / 3 Videos</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-lime-500 h-full transition-all duration-300" 
                style={{ width: `${(history.length / 3) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              {history.length >= 3 ? "Limit hit. Clear assets or upgrade to continue." : "Slots are reserved for high speed."}
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
              onClick={() => !uploading && history.length < 3 && fileInputRef.current.click()}
              className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ${
                history.length >= 3 
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
                disabled={uploading || history.length >= 3}
              />
              <div className="text-center px-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border ${isDragActive ? 'bg-lime-500/10 border-lime-400 text-lime-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {history.length >= 3 ? (
                  <p className="text-sm text-neutral-400 font-medium">3 Video Upload capacity has been filled</p>
                ) : (
                  <>
                    <p className="mb-1 text-sm text-neutral-200">
                      <span className="font-semibold text-lime-400">Click to browse</span> or drag files right here
                    </p>
                    <p className="text-xs text-neutral-500">Max file restriction is 500MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Stage File Info Summary Card */}
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

            {/* Dynamic S3 Stream Processing Bar with Upload Speed */}
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
              <h2 className="text-lg font-semibold text-white">Project History Log</h2>
            </div>
            
            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 bg-neutral-950/40 border border-neutral-800 border-dashed rounded-xl">
                <p className="text-xs text-neutral-500 italic max-w-[180px]">You haven't uploaded any videos yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div key={item.id} className="group flex flex-col p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-white truncate max-w-[190px] group-hover:text-lime-400 transition-colors">
                        {item.original_name}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700/50 flex-shrink-0">
                        {formatDuration(item.duration)}
                      </span>
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
                      <span>Key: {item.file_key.substring(0, 8)}...</span>
                      <span>Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        
      </div>
    </div>
  );
}