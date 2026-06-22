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
          {/* Accent Glow */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-lime-400/10 blur-3xl rounded-full"></div>
          
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
              <button className="bg-lime-400 hover:bg-lime-500 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-lime-400/10 hover:shadow-lime-400/20 text-sm">
                Sign In to Account
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  // Standard interactive UI view when the user IS logged in
  const formatDuration = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
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
      };

      xhr.onerror = () => {
        alert('Network connection lost during S3 transmission.');
        setUploading(false);
      };

      xhr.send(file);

    } catch (error) {
      alert(error.message);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 text-white">
    <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative">
        
        {/* Header Display */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Upload <span className="text-lime-400">Video</span>
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-lime-400/10 border border-lime-400/20 rounded-full text-xs text-lime-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
            Workspace Active: 3 File Limit (Max 500MB)
          </div>
        </div>

        {/* Drag Input Box Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current.click()}
          className={`relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
            isDragActive ? 'border-lime-400 bg-lime-500/10 shadow-lg shadow-lime-400/5' : 'border-neutral-700 bg-neutral-900/50 hover:border-lime-400/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
            disabled={uploading}
          />
          <div className="text-center px-4">
            <p className="mb-2 text-sm text-neutral-200">
              <span className="font-semibold text-lime-400">Click to browse</span> or drag and drop video assets
            </p>
            <p className="text-xs text-neutral-500">Files sync instantly across AWS S3 and Supabase Architecture</p>
          </div>
        </div>

        {/* File View Card */}
        {file && (
          <div className="mt-6 bg-neutral-800/40 border border-neutral-800 rounded-xl p-4">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-neutral-200 font-medium truncate max-w-[250px]">{file.name}</span>
              <span className="text-lime-400 font-mono text-xs bg-lime-400/10 px-2 py-0.5 rounded">
                Duration: {formatDuration(videoDuration)}
              </span>
            </div>
            {!uploading && (
              <button
                onClick={handleUpload}
                className="w-full bg-lime-400 hover:bg-lime-500 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-colors duration-200 shadow-md"
              >
                Upload Video
              </button>
            )}
          </div>
        )}

        {/* Uploading Progress Tracking */}
        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between text-xs font-semibold text-lime-400 mb-2">
              <span>Streaming assets to cloud storage...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div className="bg-lime-400 h-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Supabase History Logs */}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-400 mb-4 tracking-wider uppercase">
            Your Upload History ({history.length}/3)
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-neutral-600 italic">No cloud database logs found for this account.</p>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-medium text-white truncate max-w-[280px]">
                      {item.original_name}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      S3 Key: <span className="font-mono text-neutral-400">{item.file_key.substring(0, 13)}...</span>
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-1 rounded border border-neutral-700/50 flex-shrink-0">
                    {formatDuration(item.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}