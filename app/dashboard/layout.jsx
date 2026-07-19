"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { Sidebar } from "./components/Sidebar";
import { DashboardHeader } from "./components/DashboardHeader";

export default function DashboardLayout({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && !isSignedIn) {
    return <>{children}</>; // Fallback to page-level auth gate
  }

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f3f4f6", color: "#0F2347", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <Sidebar />

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f3f4f6" }}>
        <DashboardHeader />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
