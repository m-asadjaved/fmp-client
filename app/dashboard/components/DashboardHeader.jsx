"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

export function DashboardHeader() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Dynamic titles based on pathname
  let title = "Overview";
  let subtitleText = "Live Status";
  let subtitleStyle = {
    background: "rgba(74, 222, 128, 0.1)",
    color: "#4ade80",
    border: "1px solid rgba(74, 222, 128, 0.2)",
    textTransform: "uppercase",
  };

  if (pathname.includes("/calendar")) {
    title = "Content Calendar";
    subtitleText = "Manage and track your scheduled video posts";
    subtitleStyle = {
      color: "#4b5563",
      fontWeight: "normal",
      textTransform: "none",
    };
  } else if (pathname.includes("/assets")) {
    title = "Assets Workspace";
    subtitleText = "Manage your raw footage and media";
    subtitleStyle = {
      color: "#4b5563",
      fontWeight: "normal",
      textTransform: "none",
    };
  }

  // Fetch notifications
  useEffect(() => {
    fetch('/api/user/notifications')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setNotifications(data.notifications || []);
      })
      .catch(err => console.error("Error fetching notifications:", err));
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
      <div style={{ display: "flex", flexDirection: pathname.includes("/calendar") || pathname.includes("/assets") ? "column" : "row", alignItems: pathname.includes("/calendar") || pathname.includes("/assets") ? "flex-start" : "center", gap: pathname.includes("/calendar") || pathname.includes("/assets") ? 4 : 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F2347", letterSpacing: "-0.03em", margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontSize: 13, ...subtitleStyle, padding: pathname.includes("/calendar") || pathname.includes("/assets") ? 0 : "2px 8px", borderRadius: 12, fontWeight: pathname.includes("/calendar") || pathname.includes("/assets") ? 400 : 700, letterSpacing: pathname.includes("/calendar") || pathname.includes("/assets") ? "normal" : "0.05em" }}>
          {subtitleText}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
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
