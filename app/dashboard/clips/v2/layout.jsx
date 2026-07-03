"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Video, Settings, User } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  const NAV_ITEMS = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard/v2" },
    { label: "Calendar", icon: Calendar, href: "/dashboard/v2/calendar" },
    { label: "New Post", icon: Video, href: "/editor" },
  ];

  if (isLoaded && !isSignedIn) {
    return <>{children}</>; // Fallback to page-level auth gate
  }

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#09090b", color: "#fafafa", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 260,
        background: "#18181b",
        borderRight: "1px solid #27272a",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: "32px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124, 58, 237, 0.4)"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>
            ClipAI
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 12px", marginBottom: 4 }}>
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", borderRadius: 10,
                  background: isActive ? "rgba(124, 58, 237, 0.1)" : "transparent",
                  color: isActive ? "#c4b5fd" : "#a1a1aa",
                  border: `1px solid ${isActive ? "rgba(124, 58, 237, 0.2)" : "transparent"}`,
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#27272a";
                    e.currentTarget.style.color = "#fafafa";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#a1a1aa";
                  }
                }}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "#a78bfa" : "currentColor"} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div style={{ padding: "24px 20px", borderTop: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#27272a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserButton appearance={{ elements: { userButtonAvatarBox: { width: "36px", height: "36px" } } }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>My Account</span>
              <span style={{ fontSize: 12, color: "#71717a" }}>Manage Profile</span>
            </div>
          </div>
          <button style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: 4 }}>
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#09090b" }}>
        {children}
      </div>
    </div>
  );
}
