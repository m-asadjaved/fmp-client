"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, Video, Clock, CheckCircle2, ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Platform Map for Colors & Icons ──────────────────────────────────────────
const PLATFORM_META = {
  YouTube: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  TikTok: { color: "#f9fafb", bg: "#f4f4f5", border: "#e4e4e7" },
  "Instagram Reels": { color: "#e11d74", bg: "#fff1f7", border: "#fbcfe8" },
};
const DEFAULT_PLATFORM_META = { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };

// ─── Calendar Helper Functions ────────────────────────────────────────────────
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const getMonthName = (monthIndex) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthIndex];
};

export default function CalendarPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Scheduled Jobs
  useEffect(() => {
    if (!isSignedIn) return;
    setIsLoading(true);
    fetch("/api/export/calendar")
      .then(res => res.json())
      .then(data => {
        setJobs(data.jobs || []);
      })
      .catch(err => console.error("Failed to load calendar jobs:", err))
      .finally(() => setIsLoading(false));
  }, [isSignedIn]);

  const handleDeleteJob = async (jobId) => {
    if (!confirm("Are you sure you want to remove this scheduled post?")) return;
    try {
      const res = await fetch(`/api/export/calendar?id=${jobId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setJobs(jobs.filter(j => j.id !== jobId));
      } else {
        alert("Failed to delete scheduled post.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting scheduled post.");
    }
  };

  // Calendar state derivations
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth); // 0 = Sunday

  // Group jobs by date (YYYY-MM-DD)
  const jobsByDate = jobs.reduce((acc, job) => {
    if (!job.scheduled_for) return acc;
    const dateObj = new Date(job.scheduled_for);
    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {});

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid
  const calendarGrid = [];
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.push({ isPadding: true, key: `padding-start-${i}` });
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayJobs = jobsByDate[dateKey] || [];
    calendarGrid.push({
      isPadding: false,
      day: d,
      dateKey,
      jobs: dayJobs,
      key: `day-${d}`,
      isToday: new Date().toDateString() === new Date(currentYear, currentMonth, d).toDateString()
    });
  }

  // Auth gate
  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9fafb] text-white">
        <p>Please sign in to view your calendar.</p>
      </div>
    );
  }

  return (
    <div style={{
      height: "100%", backgroundColor: "#f9fafb", color: "#0F2347",
      fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column"
    }}>


      {/* ── CALENDAR GRID ── */}
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        <div style={{ 
          background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          
          {/* Day of week headers */}
          <div style={{ 
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid #e5e7eb", background: "#f3f4f6"
          }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{
                padding: "12px 16px", fontSize: 12, fontWeight: 700,
                color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em",
                textAlign: "right"
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#e5e7eb", gap: "1px" }}>
            {calendarGrid.map((cell) => {
              if (cell.isPadding) {
                return <div key={cell.key} style={{ background: "#f3f4f6", minHeight: 140 }} />
              }

              return (
                <div key={cell.key} style={{
                  background: cell.isToday ? "rgba(0, 192, 212, 0.05)" : "#ffffff",
                  minHeight: 140, padding: 12, display: "flex", flexDirection: "column",
                  transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: cell.isToday ? "#0F2347" : "transparent",
                      color: cell.isToday ? "#fff" : "#0F2347",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {cell.day}
                    </div>
                  </div>

                  {/* Scheduled Jobs for the day */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto" }}>
                    {cell.jobs.map((job) => {
                      const timeString = new Date(job.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isCompleted = job.status === 'completed';
                      
                      return (
                        <div 
                          key={job.id} 
                          onClick={() => {
                            if (job.video_id) {
                              router.push(`/editor/${job.video_id}`);
                            }
                          }}
                          style={{
                            background: isCompleted ? "rgba(74, 222, 128, 0.1)" : "#e5e7eb",
                            border: `1px solid ${isCompleted ? "rgba(74, 222, 128, 0.2)" : "#d1d5db"}`,
                            borderRadius: 8, padding: "8px 10px",
                            display: "flex", flexDirection: "column", gap: 4,
                            cursor: job.video_id ? "pointer" : "default",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (job.video_id && !isCompleted) {
                              e.currentTarget.style.background = "#d1d5db";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (job.video_id && !isCompleted) {
                              e.currentTarget.style.background = "#e5e7eb";
                            }
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isCompleted ? "#4ade80" : "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={10} /> {timeString}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {job.video_id && !isCompleted && <Edit2 size={12} color="#4b5563" />}
                              {!isCompleted && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteJob(job.id);
                                  }}
                                  style={{
                                    background: "transparent", border: "none", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    padding: 2, borderRadius: 4
                                  }}
                                  title="Remove Schedule"
                                >
                                  <Trash2 size={12} color="#ef4444" />
                                </button>
                              )}
                              {isCompleted && <CheckCircle2 size={12} color="#4ade80" />}
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            {job.platforms?.map((platName, idx) => {
                              const meta = PLATFORM_META[platName] || DEFAULT_PLATFORM_META;
                              return (
                                <span key={idx} style={{
                                  fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                                  padding: "2px 6px", borderRadius: 4,
                                  background: meta.bg, color: meta.color,
                                  border: `1px solid ${meta.border}`
                                }}>
                                  {platName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
