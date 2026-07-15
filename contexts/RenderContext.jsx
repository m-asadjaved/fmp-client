"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const RenderContext = createContext();

export function useRenderContext() {
  const context = useContext(RenderContext);
  if (!context) {
    console.warn("useRenderContext called outside of RenderProvider. Providing fallback.");
    return { tasks: {}, addRenderTask: () => {}, removeTask: () => {} };
  }
  return context;
}

export function RenderProvider({ children }) {
  const [tasks, setTasks] = useState({}); // renderId -> task data

  const addRenderTask = useCallback((renderId, bucketName, metadata) => {
    setTasks(prev => ({
      ...prev,
      [renderId]: {
        renderId,
        bucketName,
        progress: 0,
        status: "rendering", // rendering, done, error
        metadata,
        url: null,
        error: null,
      }
    }));
    
    // Start polling for this task
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/export/progress?renderId=${renderId}&bucketName=${bucketName}`);
        const pg = await r.json();
        
        if (pg.done) {
          clearInterval(poll);
          setTasks(prev => ({
            ...prev,
            [renderId]: { ...prev[renderId], progress: 100, status: "done", url: pg.outUrl }
          }));
          
          if (metadata?.isPostJob) {
            // Trigger the backend poll route which handles YouTube uploading for completed renders
            fetch("/api/export/poll").catch(console.error);
          } else {
            // Auto download
            try {
              const a = document.createElement("a");
              a.href = pg.outUrl;
              a.download = metadata.filename || `video-${renderId}.mp4`;
              a.target = "_blank";
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (err) {
              console.error("Auto download failed", err);
            }
          }
          
          // We intentionally do not auto-remove the task here so the user has a persistent notification
          // to download the file manually if the auto-download was blocked by the browser.
          
        } else if (pg.fatalErrorEncountered) {
          clearInterval(poll);
          setTasks(prev => ({
            ...prev,
            [renderId]: { ...prev[renderId], status: "error", error: "Render failed" }
          }));
        } else {
          setTasks(prev => ({
            ...prev,
            [renderId]: { ...prev[renderId], progress: Math.round(pg.overallProgress * 100) }
          }));
        }
      } catch (err) {
        clearInterval(poll);
        setTasks(prev => ({
          ...prev,
          [renderId]: { ...prev[renderId], status: "error", error: err.message }
        }));
      }
    }, 2000);
  }, []);

  const removeTask = useCallback((renderId) => {
    setTasks(prev => {
      const next = { ...prev };
      delete next[renderId];
      return next;
    });
  }, []);

  return (
    <RenderContext.Provider value={{ tasks, addRenderTask, removeTask }}>
      {children}
      <RenderToasts tasks={tasks} removeTask={removeTask} />
    </RenderContext.Provider>
  );
}

function RenderToasts({ tasks, removeTask }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const taskList = Object.values(tasks);
  if (taskList.length === 0) return null;

  if (isMinimized) {
    const renderingCount = taskList.filter(t => t.status === "rendering").length;
    const doneCount = taskList.filter(t => t.status === "done").length;
    
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#18181b", border: "1px solid #27272a", borderRadius: 99, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease-out", transition: "transform 0.1s" }}
        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        {renderingCount > 0 ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 2s linear infinite" }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        ) : doneCount > 0 ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        )}
        <span style={{ color: "#fafafa", fontWeight: 600, fontSize: 14 }}>
          {renderingCount > 0 ? `${renderingCount} Rendering...` : `${taskList.length} Task${taskList.length > 1 ? 's' : ''}`}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setIsMinimized(true)} style={{ background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: "99px", padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          Hide Tasks
        </button>
      </div>

      {taskList.map(task => {
        const isDone = task.status === "done";
        const isError = task.status === "error";
        const radius = 14;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (task.progress / 100) * circumference;
        
        return (
          <div key={task.renderId} style={{
            background: "#18181b", border: "1px solid #27272a", borderRadius: 12, padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)", width: 280, animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {task.metadata?.filename || "Rendering Video..."}
              </span>
              {isError && <span style={{ fontSize: 11, color: "#ef4444" }}>{task.error}</span>}
              {!isError && !isDone && <span style={{ fontSize: 11, color: "#71717a" }}>{task.metadata?.isPostJob ? "Rendering for auto-post..." : "Rendering..."}</span>}
              {isDone && <span style={{ fontSize: 11, color: "#10b981" }}>{task.metadata?.isPostJob ? "Rendered! Uploading to YouTube..." : "Complete"}</span>}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {isError ? (
                 <button onClick={() => removeTask(task.renderId)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              ) : isDone ? (
                 <a href={task.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", textDecoration: "none", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform="scale(0.9)"} onMouseUp={e => e.currentTarget.style.transform="scale(1)"} onMouseLeave={e => e.currentTarget.style.transform="scale(1)"} title="Download File">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 </a>
              ) : (
                 <div className="progress-circle-container" style={{ position: "relative", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }} onClick={() => removeTask(task.renderId)} title="Cancel Render">
                   <svg width="32" height="32" viewBox="0 0 36 36" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                     <circle cx="18" cy="18" r={radius} fill="none" stroke="#27272a" strokeWidth="3" />
                     <circle cx="18" cy="18" r={radius} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 0.2s ease-out" }} />
                   </svg>
                   <span className="progress-text" style={{ fontSize: 9, fontWeight: 700, color: "#10b981", zIndex: 1, letterSpacing: "-0.5px", marginLeft: "1px" }}>{task.progress}%</span>
                   <div className="progress-cancel" style={{ display: "none", position: "absolute", zIndex: 2, background: "rgba(24, 24, 27, 0.9)", width: "100%", height: "100%", borderRadius: "50%", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                   </div>
                 </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .progress-circle-container:hover .progress-text { display: none !important; }
        .progress-circle-container:hover .progress-cancel { display: flex !important; }
      `}</style>
    </div>
  );
}
