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
    <header className="flex justify-between items-center px-10 py-5 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4 group cursor-pointer transition-all duration-300">
        <div className="w-11 h-11 rounded-full bg-[var(--border-subtle)] overflow-hidden flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ring-2 ring-transparent group-hover:ring-[var(--primary)]/30">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--border-subtle)]" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[16px] font-extrabold text-[var(--on-surface)] tracking-tight group-hover:text-[var(--primary)] transition-colors duration-300">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || "My Account"}
          </span>
          <div className="flex items-center h-4">
            {currentPlan ? (
              <span className="text-[11px] text-[var(--primary)] font-bold uppercase tracking-[0.08em]">
                {currentPlan} Plan
              </span>
            ) : (
              <Loader2 size={12} className="animate-spin text-[var(--primary)]" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Metrics Display */}
        <div className="flex items-center gap-3">
          {loadingMetrics ? (
            <Loader2 size={16} className="animate-spin text-[var(--on-surface-variant)]" />
          ) : (
            <>
              <div className="flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-default">
                <div className="flex items-center justify-center w-8 h-8 bg-[var(--primary)]/10 rounded-lg">
                  <Cloud size={16} className="text-[var(--primary)]" />
                </div>
                <div className="flex flex-col pr-1">
                  <span className="text-[10px] text-[var(--on-surface-variant)] font-bold uppercase tracking-wider leading-none mb-1">Storage</span>
                  <span className="text-[13px] font-bold text-[var(--on-surface)] leading-none">
                    {metrics.storageGB}GB <span className="text-[var(--on-surface-variant)] font-medium text-xs">/ {PLAN_LIMITS[currentPlanId]?.maxStorageGB || 10}GB</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-default">
                <div className="flex items-center justify-center w-8 h-8 bg-pink-500/10 rounded-lg">
                  <Hourglass size={16} className="text-pink-500" />
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-[10px] text-[var(--on-surface-variant)] font-bold uppercase tracking-wider leading-none mb-1">Credits</span>
                  <span className="text-[13px] font-bold text-[var(--on-surface)] leading-none">
                    {metrics.credits.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-default">
                <div className="flex items-center justify-center w-8 h-8 bg-teal-500/10 rounded-lg">
                  <Video size={16} className="text-teal-500" />
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-[10px] text-[var(--on-surface-variant)] font-bold uppercase tracking-wider leading-none mb-1">Active</span>
                  <span className="text-[13px] font-bold text-[var(--on-surface)] leading-none">
                    {metrics.activeProjects} <span className="text-[var(--on-surface-variant)] font-medium text-xs">Projects</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative ml-2 pl-6 border-l border-[var(--border-subtle)] flex items-center">
          <button 
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} 
            className="relative p-2.5 rounded-xl text-[var(--on-surface-variant)] hover:bg-[var(--border-subtle)] hover:text-[var(--on-surface)] transition-all duration-300 focus:outline-none"
          >
            <Bell size={20} className={showNotificationsDropdown ? "text-[var(--primary)]" : ""} />
            {notifications.some(n => !n.acknowledged) && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div className="absolute top-full right-0 mt-4 w-[360px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl z-[100] overflow-hidden transform origin-top-right transition-all">
              <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-bg)]/80">
                <h4 className="m-0 text-sm font-bold text-[var(--on-surface)]">Notifications</h4>
                <button 
                  className="bg-transparent border-none text-[var(--primary)] text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:text-[#00a8ba] transition-colors"
                  onClick={() => {
                    fetch('/api/user/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) })
                      .then(() => setNotifications(prev => prev.map(n => ({ ...n, acknowledged: true }))));
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[var(--on-surface-variant)] text-sm font-medium">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`px-5 py-4 border-b border-[var(--border-subtle)] flex gap-3 transition-colors ${
                        n.acknowledged ? "bg-transparent opacity-70 hover:opacity-100" : "bg-[var(--primary)]/10"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'success' ? 'bg-green-400' : 
                        n.type === 'error' ? 'bg-red-400' : 
                        n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1">
                        <p className="m-0 mb-1 text-[13px] font-bold text-[var(--on-surface)]">{n.title}</p>
                        <p className="m-0 mb-1.5 text-[12px] text-[var(--on-surface-variant)] leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-[var(--on-surface-variant)] font-medium">
                          {new Date(n.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
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
