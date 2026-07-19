"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Cloud, Hourglass, Video, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { PLAN_LIMITS } from "../../config/plan-limits";

export function DashboardHeader() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
  const [metrics, setMetrics] = useState({ credits: 0, activeProjects: 0, storageGB: "0.00" });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentPlanId, setCurrentPlanId] = useState("free");
  useEffect(() => {
    fetch('/api/user/notifications')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setNotifications(data.notifications || []);
      })
      .catch(err => console.error("Error fetching notifications:", err));

    fetch('/api/upload')
      .then(res => res.json())
      .then(data => {
        setMetrics(prev => ({ ...prev, credits: data.credits ?? 0, activeProjects: data.history?.length || 0 }));
      })
      .catch(err => console.error("Error fetching metrics:", err));

    fetch('/api/user/storage')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMetrics(prev => ({ ...prev, storageGB: data.totalSizeGB || "0.00" }));
      })
      .catch(err => console.error("Error fetching storage:", err))
      .finally(() => setLoadingMetrics(false));

    fetch('/api/credits')
      .then(res => res.json())
      .then(data => {
        if (data.currentPlan) {
          const rawId = data.currentPlan.toLowerCase();
          setCurrentPlanId(rawId.startsWith("pri_") ? "pro" : rawId);
          setCurrentPlan(rawId.charAt(0).toUpperCase() + rawId.slice(1));
        }
      })
      .catch(console.error);
  }, []);

  return (
    <header style={{ 
      display: "flex", justifyContent: "space-between", alignItems: "center", 
      borderBottom: "1px solid #e5e7eb",
      padding: "24px 40px",
      background: "#ffffff",
      boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      zIndex: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #f3f4f6" }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#d1d5db" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0F2347", letterSpacing: "-0.02em" }}>
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || "My Account"}
          </span>
          {currentPlan ? (
            <span style={{ fontSize: 12, color: "#00C0D4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {currentPlan}
            </span>
          ) : (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#00C0D4" }} />
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* Metrics Display */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 4, paddingRight: 24, borderRight: "1px solid #e5e7eb" }}>
          {loadingMetrics ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "#9ca3af" }} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #f3f4f6", padding: "4px 12px", borderRadius: 20 }}>
                <Cloud size={14} color="#00C0D4" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563" }}>{metrics.storageGB}GB <span style={{ color: "#9ca3af", fontWeight: 500 }}>/ {PLAN_LIMITS[currentPlanId]?.maxStorageGB || 10}GB</span></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #f3f4f6", padding: "4px 12px", borderRadius: 20 }}>
                <Hourglass size={14} color="#f472b6" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563" }}>{metrics.credits.toFixed(1)} <span style={{ color: "#9ca3af", fontWeight: 500 }}>Credits</span></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #f3f4f6", padding: "4px 12px", borderRadius: 20 }}>
                <Video size={14} color="#2dd4bf" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4b5563" }}>{metrics.activeProjects} <span style={{ color: "#9ca3af", fontWeight: 500 }}>Active</span></span>
              </div>
            </>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} style={{ position: "relative", background: "transparent", border: "none", color: "#4b5563", cursor: "pointer", padding: 4 }}>
            <Bell size={20} />
            {notifications.some(n => !n.acknowledged) && <span style={{ position: "absolute", top: 2, right: 4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: "2px solid #f9fafb" }}></span>}
          </button>

          {showNotificationsDropdown && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 12, width: 340, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 12px 48px rgba(15,35,71,0.06)", zIndex: 1000, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f3f4f6" }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F2347" }}>Notifications</h4>
                <button style={{ background: "transparent", border: "none", color: "#00C0D4", fontSize: 11, fontWeight: 600, cursor: "pointer" }} onClick={() => {
                  fetch('/api/user/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) })
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, acknowledged: true }))));
                }}>Mark all read</button>
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: n.acknowledged ? "transparent" : "rgba(0, 192, 212, 0.05)", display: "flex", gap: 12, opacity: n.acknowledged ? 0.7 : 1 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.type === 'success' ? '#4ade80' : n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#3b82f6', marginTop: 6, flexShrink: 0 }}></div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#0F2347" }}>{n.title}</p>
                        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#4b5563", lineHeight: 1.4 }}>{n.message}</p>
                        <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{new Date(n.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
