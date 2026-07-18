"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Trash2, CheckCircle } from "lucide-react";

export default function SplitScreenModal({
  isOpen,
  onClose,
  defaultTemplates,
  userSplits,
  selectedSplit,
  onSelectSplit,
  onUploadStart,
  onUploadSuccess,
  onDeleteSplit,
}) {
  const [activeTab, setActiveTab] = useState("templates"); // 'templates' | 'uploads'
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // Group default templates by category
  const categories = defaultTemplates.reduce((acc, tmpl) => {
    const cat = tmpl.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tmpl);
    return acc;
  }, {});

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/mp4")) {
      alert("Please select a valid .mp4 video file.");
      return;
    }

    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      // 1. Get Presigned URL
      const res = await fetch("/api/upload/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");

      const { uploadUrl } = await res.json();

      // 2. Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload video to S3");

      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (key) => {
    if (!confirm("Are you sure you want to delete this custom split video?")) return;
    try {
      const res = await fetch("/api/splits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to delete video");
      if (onDeleteSplit) onDeleteSplit();
    } catch (err) {
      console.error(err);
      alert("Failed to delete video.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" style={{ zIndex: 999999 }}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Select Split Screen Video</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === "templates" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Predefined Templates
          </button>
          <button
            onClick={() => setActiveTab("uploads")}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === "uploads" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Your Uploads
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === "templates" && (
            <div className="space-y-8 animate-fadeIn">
              {Object.keys(categories).map((category) => (
                <div key={category} className="space-y-3">
                  {category !== "None" && (
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{category}</h3>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {categories[category].map((tmpl) => (
                      <SplitItem 
                        key={tmpl.id}
                        tmpl={tmpl}
                        isSelected={selectedSplit?.id === tmpl.id}
                        onSelect={() => {
                          onSelectSplit(tmpl);
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "uploads" && (
            <div className="animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Upload Button Card */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative aspect-[9/16] rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 text-indigo-500">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-500 transition-colors">
                        <UploadCloud size={24} />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600">Upload New Video</span>
                      <span className="text-xs text-gray-400">MP4 only</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="video/mp4" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>

                {/* User Uploads */}
                {userSplits.map((tmpl) => (
                  <div key={tmpl.id} className="relative group">
                    <SplitItem 
                      tmpl={tmpl}
                      isSelected={selectedSplit?.id === tmpl.id}
                      onSelect={() => {
                        onSelectSplit(tmpl);
                        onClose();
                      }}
                    />
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tmpl.key);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg transform hover:scale-105 z-10"
                      title="Delete Video"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Reusable Video Thumbnail Item
function SplitItem({ tmpl, isSelected, onSelect }) {
  if (tmpl.id === "none") {
    return (
      <div 
        onClick={onSelect}
        className={`relative aspect-[9/16] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 ${
          isSelected 
            ? "border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50" 
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
        }`}
      >
        <span className="text-4xl mb-2">{tmpl.emoji}</span>
        <span className={`text-sm font-semibold text-center px-2 ${isSelected ? "text-indigo-700" : "text-gray-600"}`}>
          {tmpl.name}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2 text-indigo-600">
            <CheckCircle size={20} className="stroke-white" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={onSelect}
      className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer transition-all border-2 bg-black ${
        isSelected 
          ? "border-indigo-600 shadow-lg ring-4 ring-indigo-50" 
          : "border-transparent hover:ring-2 hover:ring-gray-300"
      }`}
    >
      <video 
        src={tmpl.url} 
        preload="metadata"
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        muted
        loop
        playsInline
        onMouseEnter={(e) => e.target.play().catch(() => {})}
        onMouseLeave={(e) => {
          e.target.pause();
          e.target.currentTime = 0;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2">
        <span>{tmpl.emoji}</span>
        <span className="text-white text-xs font-semibold truncate shadow-sm">{tmpl.name}</span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 text-indigo-500 bg-white rounded-full">
          <CheckCircle size={22} className="stroke-indigo-500 fill-white" />
        </div>
      )}
    </div>
  );
}
