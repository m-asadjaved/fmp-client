"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { FolderOpen, Search, Trash2, Video, Music, Image as ImageIcon, Loader2, AlertCircle, Play, X } from "lucide-react";

const formatSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function AssetsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/assets");
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchAssets();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) setActiveTab(tab);
    }
  }, []);

  const handleDelete = async (asset) => {
    if (!window.confirm(`Are you sure you want to delete "${asset.name}"? This will free up storage but cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(asset.id);
      const res = await fetch("/api/user/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      });

      const data = await res.json();
      if (data.success) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      } else {
        alert(data.error || "Failed to delete asset.");
      }
    } catch (err) {
      alert("An error occurred while deleting the asset.");
    } finally {
      setDeletingId(null);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "Raw Video":
      case "B-Roll":
        return <Video size={20} />;
      case "Generated Clip":
        return <Play size={20} />;
      case "Music":
        return <Music size={20} />;
      case "Hook":
        return <ImageIcon size={20} />;
      default:
        return <FolderOpen size={20} />;
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesTab = activeTab === "All" || asset.type === activeTab;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesDate = true;
    if (startDate || endDate) {
      try {
        const assetDate = asset.date ? new Date(asset.date).toISOString().split('T')[0] : null;
        if (assetDate) {
          if (startDate && assetDate < startDate) matchesDate = false;
          if (endDate && assetDate > endDate) matchesDate = false;
        } else {
          matchesDate = false;
        }
      } catch (e) {
        matchesDate = false;
      }
    }
    return matchesTab && matchesSearch && matchesDate;
  });

  if (!isLoaded || (!isSignedIn && loading)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--on-surface-variant)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const TABS = ["All", "Raw Video", "Generated Clip", "B-Roll", "Music", "Hook"];

  return (
    <div className="bg-dot-pattern stagger-1" style={{ padding: "32px 40px", overflowY: "auto", height: "100%", backgroundColor: "var(--surface-bg)", color: "var(--on-surface)" }}>


      {/* Controls */}
      <div className="stagger-1" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, background: "var(--surface)", padding: 4, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#e5e7eb" : "transparent",
                color: activeTab === tab ? "#0F2347" : "#4b5563",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 600 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--on-surface-variant)" }} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--on-surface)",
                padding: "10px 16px 10px 36px",
                borderRadius: 10,
                fontSize: 14,
                outline: "none"
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", width: 135 }}>
               <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--on-surface-variant)",
                    padding: "10px 28px 10px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
               />
               {startDate && (
                 <button 
                   onClick={() => setStartDate("")}
                   style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "var(--surface)", border: "none", color: "var(--on-surface-variant)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}
                   title="Clear start date"
                 >
                   <X size={14} />
                 </button>
               )}
            </div>
            <span style={{ color: "var(--on-surface-variant)", fontSize: 13, fontWeight: 500 }}>to</span>
            <div style={{ position: "relative", width: 135 }}>
               <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--on-surface-variant)",
                    padding: "10px 28px 10px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
               />
               {endDate && (
                 <button 
                   onClick={() => setEndDate("")}
                   style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "var(--surface)", border: "none", color: "var(--on-surface-variant)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}
                   title="Clear end date"
                 >
                   <X size={14} />
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16, height: 140 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#e5e7eb", marginBottom: 12, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              <div style={{ height: 16, width: "80%", background: "#e5e7eb", borderRadius: 4, marginBottom: 8, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              <div style={{ height: 12, width: "40%", background: "#e5e7eb", borderRadius: 4, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            </div>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "var(--surface)", borderRadius: 16, border: "1px dashed var(--border-subtle)" }}>
          <AlertCircle size={36} style={{ color: "var(--on-surface-variant)", margin: "0 auto 12px" }} />
          <h4 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--on-surface)" }}>No assets found</h4>
          <p style={{ margin: 0, fontSize: 13, color: "var(--on-surface-variant)" }}>
            {searchQuery ? "Try adjusting your search filters." : "You haven't uploaded any media yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {filteredAssets.map((asset, index) => (
            <div
              key={asset.id}
              className={`stagger-${(index % 3) + 1} group hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 16,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* THUMBNAIL AREA */}
              <div className="relative w-full aspect-video bg-[var(--surface-bg)] flex items-center justify-center overflow-hidden border-b border-[var(--border-subtle)]">
                {asset.thumbnail_url ? (
                  <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--on-surface-variant)] group-hover:scale-105 transition-transform duration-500 gap-2 opacity-50">
                    {getIconForType(asset.type)}
                  </div>
                )}
                <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/90 backdrop-blur-sm text-gray-900 px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider border border-white/20">
                  {asset.type}
                </span>
              </div>

              {/* DETAILS AREA */}
              <div className="p-4 flex flex-col flex-1">

              <div style={{ flex: 1, marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--on-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={asset.name}>
                  {asset.name}
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--on-surface-variant)" }}>
                  <span>{formatSize(asset.size)}</span>
                  <span>•</span>
                  <span>{formatDate(asset.date)}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => handleDelete(asset)}
                  disabled={deletingId === asset.id}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "#ef4444",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: deletingId === asset.id ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: deletingId === asset.id ? 0.5 : 1,
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => { if (deletingId !== asset.id) e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {deletingId === asset.id ? (
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </button>
              </div>
            </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
