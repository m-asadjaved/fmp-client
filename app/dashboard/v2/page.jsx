'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
  Play
} from 'lucide-react';

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
  const [credits, setCredits] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch upload ledger history logs
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
      alert('Please select a valid video file.');
      return;
    }
  
    const maxSize = 500 * 1024 * 1024; // 500MB Limit
    if (selectedFile.size > maxSize) {
      alert('File size limit exceeded. Max allowed is 500MB.');
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

      let thumbnailBlob = null;
      try {
        thumbnailBlob = await generateThumbnail(file, 1);
      } catch (thumbErr) {
        console.error("Failed to extract thumbnail frame:", thumbErr);
      }

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
      });

      const data = await response.json();
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
    router.push(`/clips/v2/${videoItem.video_id}`);
  };

  // Auth Gate 1: App Loading Screen
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-background text-brand-primary font-sans">
        <Loader2 size={32} className="animate-spin mb-2" />
        <span className="text-sm font-medium tracking-wide text-brand-on-surface-variant">Initializing system context...</span>
      </div>
    );
  }

  // Auth Gate 2: Access Control Restricted Screen (Matches Design Tokens)
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-background p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-brand-border-subtle rounded-lg p-8 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full"></div>
          
          <div className="w-14 h-14 bg-brand-surfaceBg border border-brand-border-subtle text-brand-primary rounded-md flex items-center justify-center mx-auto mb-6">
            <Lock size={24} />
          </div>

          <h2 className="text-xl font-bold text-brand-on-surface tracking-tight">Access Restricted</h2>
          <p className="text-sm text-brand-on-surface-variant mt-2 leading-relaxed">
            Please sign in to unlock your custom creator dashboard, process raw video workspace formats, and analyze project clips.
          </p>

          <div className="mt-6">
            <SignInButton mode="modal">
              <button className="bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold py-2.5 px-6 rounded text-sm transition-colors w-full">
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

      {/* DASHBOARD GRID CONTENT */}
      <main className="flex-1 overflow-y-auto max-w-[1280px] mx-auto w-full px-12 py-8">
        
        {/* TOP STATUS HEADER BAR */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-brand-border-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
            <span className="bg-[#e2fbf4] text-brand-vibrant-teal text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border border-[#b2f2e1]">
              Live Status
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-1 text-brand-on-surface-variant hover:text-brand-on-surface">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-brand-on-surface leading-none">Alex Rivera</p>
                <p className="text-xs text-brand-on-surface-variant">alex@clipai.io</p>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
                alt="Profile Frame" 
                className="w-10 h-10 rounded-full object-cover border border-brand-border-subtle"
              />
            </div>
          </div>
        </header>

        {/* ANALYTICS UPPER BALANCES METRICS ROW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Storage Space allocation log */}
          <div className="bg-white border border-brand-border-subtle rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="text-brand-primary bg-brand-surfaceBg p-2 rounded">
                <Cloud size={20} />
              </div>
              <span className="text-xs font-semibold text-brand-on-surface-variant">25% Used</span>
            </div>
            <p className="text-xs font-medium text-brand-on-surface-variant mb-1">Cloud Storage</p>
            <h3 className="text-2xl font-bold mb-3">2.5GB <span className="text-sm font-normal text-brand-on-surface-variant">/ 10GB</span></h3>
            <div className="w-full bg-brand-surfaceBg h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-brand-primary to-brand-neon-purple h-full w-[25%]" />
            </div>
          </div>

          {/* Card 2: Accurate Database AI Credits State Display */}
          <div className="bg-white border border-brand-border-subtle rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="text-brand-neon-purple bg-brand-surfaceBg p-2 rounded">
                <Hourglass size={20} />
              </div>
              <button className="text-xs font-bold text-brand-primary hover:underline">Refill</button>
            </div>
            <p className="text-xs font-medium text-brand-on-surface-variant mb-1">AI Credits Remaining</p>
            <h3 className="text-2xl font-bold mb-3">
              {credits.toFixed(1)} <span className="text-sm font-normal text-brand-on-surface-variant">Credits</span>
            </h3>
            <div className="w-full bg-brand-surfaceBg h-2 rounded-full overflow-hidden">
              <div 
                className="bg-brand-neon-purple h-full transition-all duration-300" 
                style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Dynamic Project Count Ledger tracking */}
          <div className="bg-white border border-brand-border-subtle rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="text-brand-vibrant-teal bg-brand-surfaceBg p-2 rounded">
                <Video size={20} />
              </div>
              <span className="bg-[#eafbf7] text-brand-vibrant-teal text-[10px] font-bold px-2 py-0.5 rounded uppercase">Active Now</span>
            </div>
            <p className="text-xs font-medium text-brand-on-surface-variant mb-1">Active Projects</p>
            <h3 className="text-2xl font-bold mb-3">{history.length}</h3>
            
            <div className="flex items-center -space-x-2 overflow-hidden">
              <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=50&q=80" alt="" />
              <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=50&q=80" alt="" />
              <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=50&q=80" alt="" />
              <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-[#d2d9f4] text-[10px] font-bold text-brand-on-surface">
                +{Math.max(0, history.length - 3)}
              </div>
            </div>
          </div>

        </section>

        {/* CREATION HUB & DRAG DROP WORKSPACE INTERACTION SECTION */}
        <section className="bg-white border border-brand-border-subtle rounded-lg p-6 mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-brand-on-surface mb-2">Create New Project</h3>
              <p className="text-sm text-brand-on-surface-variant max-w-lg leading-relaxed">
                Transform long production footage into highly engaging vertical highlights using our integrated AI transcription models.
              </p>
            </div>
            
            <div className="inline-flex items-center gap-1.5 text-brand-primary text-xs font-semibold bg-brand-surfaceBg px-2.5 py-1 rounded">
              <Sparkles size={14} className="text-brand-neon-purple animate-pulse" />
              <span>Powered by ClipAI Turbo</span>
            </div>

            {/* Manual Link Input Control parsing container */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-brand-on-surface-variant mb-1.5">Paste Video Link</label>
              <div className="flex gap-2 max-w-xl">
                <input 
                  type="text" 
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="YouTube, Twitch, or Vimeo URL"
                  className="flex-1 bg-white border border-brand-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                />
                <button className="bg-brand-primary hover:bg-brand-primaryHover text-white text-sm font-medium px-4 py-2 rounded transition-colors">
                  Analyze
                </button>
              </div>
              <p className="text-[11px] text-brand-on-surface-variant mt-1.5">
                Supports up to 4K resolution clip files and 2-hour durations.
              </p>
            </div>
          </div>

          {/* S3 Input Component File Capture Trigger Interface */}
          <div className="h-full min-h-[180px]">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              disabled={uploading || credits <= 0}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && credits > 0 && fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center h-full transition-all duration-200 cursor-pointer ${
                credits <= 0 
                  ? 'border-brand-border-subtle bg-brand-surfaceBg opacity-50 cursor-not-allowed'
                  : isDragActive 
                    ? 'border-brand-primary bg-blue-50/50 shadow-inner' 
                    : 'border-brand-border-subtle bg-brand-surfaceBg hover:bg-slate-50'
              }`}
            >
              <div className="bg-white p-3 rounded-full shadow-sm text-brand-primary mb-2 border border-brand-border-subtle">
                <UploadCloud size={20} />
              </div>
              
              {credits <= 0 ? (
                <p className="text-xs font-semibold text-red-500">Credit Balance Expired</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-brand-on-surface mb-0.5">Upload Video Asset</p>
                  <p className="text-xs text-brand-on-surface-variant">
                    Drag & drop or <span className="text-brand-primary font-medium hover:underline">browse files</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* PERSISTENT LIVE UPLOAD PIPELINE TRANSMISSION MONITOR CARD */}
        {file && (
          <section className="bg-white border border-brand-border-subtle rounded-lg p-6 mb-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded tracking-wide uppercase">Staged Composition</span>
                <h4 className="text-sm font-bold text-brand-on-surface truncate mt-1">{file.name}</h4>
                <p className="text-xs text-brand-on-surface-variant">{formatSize(file.size)} • Duration: {formatDuration(videoDuration)}</p>
              </div>

              {!uploading && (
                <button
                  onClick={handleUpload}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] cursor-pointer text-white text-xs font-bold px-5 py-2.5 rounded transition-colors flex-shrink-0"
                >
                  Confirm & Start Upload
                </button>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-brand-primary">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                    Transmitting binary stream to secure storage node...
                  </span>
                  <div className="flex gap-4 font-mono text-brand-on-surface-variant">
                    <span>{uploadSpeed}</span>
                    <span className="text-brand-primary font-bold">{progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--surface-bg)] h-2 rounded-full overflow-hidden">
                  <div className="bg-[var(--surface)] h-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* RECENT REPOSITORIES MEDIA CARD LAYOUT */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-brand-on-surface">Recent Clips History</h3>
              <p className="text-xs text-brand-on-surface-variant">Your latest AI-generated highlights ready for export execution.</p>
            </div>
            <button className="text-sm font-bold text-brand-primary flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight size={16} />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white border border-brand-border-subtle border-dashed rounded-lg py-16 text-center">
              <Video size={36} className="mx-auto text-brand-on-surface-variant mb-2 opacity-40" />
              <p className="text-sm font-medium text-brand-on-surface-variant italic">No video logs recorded. Upload a project to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {history.map((item) => (
                <div key={item.id || item.video_id} className="bg-white border border-brand-border-subtle rounded-lg overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow transition-shadow">
                  
                  {/* Aspect Previews Area box */}
                  <div 
                    className="relative aspect-video bg-neutral-900 overflow-hidden cursor-pointer group/thumb"
                    onClick={() => setActiveVideoUrl(item.video_url)}
                  >
                    {item.thumbnail_url ? (
                      <img 
                        src={item.thumbnail_url} 
                        alt="extracted frame content" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <Video size={24} className="text-white/40" />
                      </div>
                    )}
                    
                    <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {formatDuration(item.duration)}
                    </span>

                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <div className="bg-white/90 p-2 rounded-full text-brand-primary shadow-md">
                        <Play size={16} fill="currentColor" />
                      </div>
                    </div>
                  </div>

                  {/* Operational Information Meta Segment */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="mb-4">
                      <h4 
                        onClick={() => setActiveVideoUrl(item.video_url)}
                        className="text-sm font-bold text-brand-on-surface mb-1 line-clamp-1 cursor-pointer hover:text-brand-primary transition-colors"
                      >
                        {item.original_name || 'Untitled Clip Asset'}
                      </h4>
                      <p className="text-[11px] text-brand-on-surface-variant font-mono uppercase tracking-wider">
                        Key: {item.file_key ? item.file_key.substring(0, 8) : 'Pending'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={() => handleMakeClips(item)}
                        className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={12} />
                        Make AI Clips
                      </button>
                      <div className="flex items-center justify-between text-[10px] text-brand-on-surface-variant font-mono pt-1">
                        <span>Node status:</span>
                        <span className="text-brand-vibrant-teal font-bold uppercase tracking-wider">Ready</span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER EXTERNAL REFERENCES */}
        <footer className="mt-16 pt-6 border-t border-brand-border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-brand-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-primary">ClipAI</span>
            <span>© 2026 ClipAI Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-brand-on-surface transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-on-surface transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-on-surface transition-colors">Security Node</a>
          </div>
        </footer>

      </main>

      {/* POPUP NATIVE VIDEO PLAYBACK MODAL WINDOW OVERLAY */}
      {activeVideoUrl && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setActiveVideoUrl(null)}
        >
          <div 
            className="bg-white border border-brand-border-subtle rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Navigation Control Header bar */}
            <div className="p-4 border-b border-brand-border-subtle flex justify-between items-center bg-brand-surfaceBg">
              <span className="text-xs font-mono text-brand-on-surface-variant font-semibold">Media Workspace Workspace Player</span>
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="text-brand-on-surface-variant hover:text-brand-on-surface transition-colors text-xs font-bold px-2.5 py-1 rounded bg-white border border-brand-border-subtle shadow-sm"
              >
                Close ✕
              </button>
            </div>
            
            {/* Render Context Viewport screen */}
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

    </>
  );
}