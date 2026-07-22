"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Subtitles, Sparkles, UploadCloud, FileVideo, CheckCircle2, Loader2, Play } from "lucide-react";

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

    video.onerror = (err) => reject(err);
  });
};

const formatSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SubtitlesPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const router = useRouter();
  
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/subtitles/history');
        const data = await res.json();
        if (data.history) setHistory(data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

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
      setVideoDuration(videoElement.duration);
      setFile(selectedFile);
      setUploadComplete(false);
      setProgress(0);
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
          hasThumbnail: !!thumbnailBlob,
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

      xhr.onload = async () => {
        if (xhr.status === 200) {
          setUploadSpeed('Processing subtitles...');
          setUploadComplete(true);
          
          // Call Subtitles Generate API
          try {
            const subRes = await fetch('/api/subtitles/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId: dbRecord.video_id })
            });
            const subData = await subRes.json();
            
            if (subData.success) {
               setUploadSpeed('Extracting audio... (this may take a minute)');
               
               // Poll until Lambda finishes
               const pollInterval = setInterval(async () => {
                 try {
                   const statusRes = await fetch(`/api/subtitles/status?videoId=${dbRecord.video_id}`);
                   const statusData = await statusRes.json();
                   
                   if (statusData.status === 'completed') {
                     clearInterval(pollInterval);
                     router.push(`/editor/${dbRecord.video_id}?index=0`);
                   } else if (statusData.status === 'failed') {
                     clearInterval(pollInterval);
                     alert("Audio extraction failed on the server.");
                     setUploading(false);
                   }
                 } catch (e) {
                   console.error("Polling error", e);
                 }
               }, 3000);
               
            } else {
               alert("Subtitle initialization failed: " + subData.error);
               setUploading(false);
            }
          } catch(err) {
             console.error(err);
             alert("Subtitle generation request failed.");
             setUploading(false);
          }
          
        } else {
          alert('Target storage bucket error.');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        alert('Network error during upload.');
        setUploading(false);
      };

      xhr.send(file);

    } catch (err) {
      alert(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="bg-dot-pattern stagger-1" style={{ padding: "32px 40px", overflowY: "auto", height: "100%", backgroundColor: "var(--surface-bg)", color: "var(--on-surface)" }}>
      
      <div className="stagger-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Subtitle Generator</h1>
        <p className="text-[var(--on-surface-variant)] text-sm">Upload a video and let our AI automatically generate, style, and sync subtitles for your content.</p>
      </div>

      {!file ? (
        <div className="stagger-2 mt-8">
          <div style={{ height: 280, position: "relative" }}>
              <style>{`
                @keyframes marchingAnts {
                  0% { stroke-dashoffset: 0; }
                  100% { stroke-dashoffset: -20; }
                }
                .animate-marching-ants {
                  animation: marchingAnts 0.8s linear infinite;
                }
                .dropzone-container:hover .animate-marching-ants {
                  stroke: var(--primary) !important;
                }
              `}</style>
              
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              />

              <div
                className="dropzone-container relative"
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current.click()}
                style={{
                  height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                  background: isDragActive ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "var(--surface)",
                  borderRadius: 16, cursor: "pointer",
                  padding: 24, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isDragActive ? "scale(1.02)" : "scale(1)"
                }}
                onMouseOver={e => { 
                  if (!isDragActive) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-ambient)";
                  } 
                }}
                onMouseOut={e => { 
                  if (!isDragActive) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 16, zIndex: 0 }}>
                  <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="14" fill="none" stroke={isDragActive ? "var(--primary)" : "#52525b"} strokeWidth="2" strokeDasharray="10 10" className="animate-marching-ants" style={{ transition: "stroke 0.3s" }} />
                </svg>

                <div style={{ position: "relative", zIndex: 1, background: "var(--surface-bg)", padding: 16, borderRadius: "50%", color: "var(--primary)", marginBottom: 16, border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                  <UploadCloud size={32} />
                </div>

                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--on-surface)" }}>Upload Video for Subtitles</p>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--on-surface-variant)" }}>
                    Drag & drop or <span style={{ color: "var(--primary)", fontWeight: 600 }}>browse files</span>
                  </p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)", padding: "4px 10px", borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.05em", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                    MP4, MOV, WEBM
                  </span>
                </div>
              </div>
          </div>
        </div>
      ) : (
        <div className="stagger-2 mt-8 p-8 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-14 bg-[var(--surface-bg)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--border-subtle)] relative">
                {previewUrl ? (
                  <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <FileVideo className="text-[var(--primary)] opacity-50" size={24} />
                )}
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--on-surface)] m-0 mb-1">{file.name}</h3>
                <p className="text-sm text-[var(--on-surface-variant)] m-0">{formatSize(file.size)}</p>
              </div>
            </div>
            
            {!uploading && !uploadComplete && (
              <button 
                onClick={() => setFile(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--on-surface-variant)] hover:bg-[var(--surface-bg)] transition-colors border border-[var(--border-subtle)]"
              >
                Change File
              </button>
            )}
          </div>

          {!uploading && !uploadComplete && (
            <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
              <button 
                onClick={handleUpload}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-[var(--primary)] to-indigo-500 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Sparkles size={16} />
                Generate Subtitles
              </button>
            </div>
          )}

          {uploading && (
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-[var(--primary)] flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Uploading & Analyzing Audio...
                </span>
                <span className="text-sm font-bold text-[var(--on-surface-variant)]">{progress}% ({uploadSpeed})</span>
              </div>
              <div className="w-full h-3 bg-[var(--surface-bg)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadComplete && (
            <div className="flex flex-col items-center justify-center p-8 bg-[var(--surface-bg)] rounded-xl border border-[var(--border-subtle)] mt-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-[var(--on-surface)] mb-2">Upload Successful!</h3>
              <p className="text-[var(--on-surface-variant)] text-center max-w-md text-sm mb-6">
                Your video has been securely uploaded. The AI subtitle transcription and styling engine is currently under construction and will be available soon.
              </p>
              <button 
                onClick={() => { setFile(null); setUploadComplete(false); }}
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[var(--surface)] text-[var(--on-surface)] border border-[var(--border-subtle)] hover:bg-[var(--surface-bg)] transition-all"
              >
                Upload Another Video
              </button>
            </div>
          )}
        </div>
      )}

      {/* RECENT SUBTITLES HISTORY */}
      <div className="stagger-3 mt-12 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--on-surface)] m-0">Recent Subtitles</h2>
            <p className="text-sm text-[var(--on-surface-variant)] m-0">Projects you have recently transcribed and styled.</p>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl border-dashed">
            <FileVideo className="mx-auto text-[var(--on-surface-variant)] opacity-50 mb-3" size={32} />
            <h3 className="text-[var(--on-surface)] font-semibold mb-1">No subtitles generated yet</h3>
            <p className="text-[var(--on-surface-variant)] text-sm m-0">Upload a video above to create your first styled subtitle project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {history.map((project) => (
              <div key={project.id} className="group bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden hover:border-[var(--primary)] transition-all hover:shadow-lg cursor-pointer">
                <div className="aspect-video bg-black relative">
                  {project.thumbnailUrl ? (
                    <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--surface-bg)] text-[var(--on-surface-variant)]">
                      <FileVideo size={32} className="opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/editor/${project.videoId}`);
                      }}
                      className="w-full py-2 bg-[var(--primary)] text-white font-bold rounded-lg flex justify-center items-center gap-2"
                    >
                      <Play size={16} /> Open Editor
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur text-white text-xs font-semibold rounded-md border border-white/10">
                    {formatSize(project.duration * 1000 * 1000 /* mockup format */)} {/* Mocked duration format */}
                  </div>
                </div>
                <div className="p-4 border-t border-[var(--border-subtle)]">
                  <h4 className="font-bold text-[var(--on-surface)] m-0 truncate">{project.name}</h4>
                  <p className="text-xs text-[var(--on-surface-variant)] m-0 mt-1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
