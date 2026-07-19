"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Video, Settings, Database } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = React.useState("loading...");

  React.useEffect(() => {
    fetch('/api/credits', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.currentPlan) {
          let displayName = data.currentPlan;
          if (displayName.toLowerCase().startsWith("pri_")) {
            displayName = "Pro"; // Fallback to mask ID
          }
          setCurrentPlan(displayName.charAt(0).toUpperCase() + displayName.slice(1));
        }
      })
      .catch(console.error);
  }, []);

  const NAV_ITEMS = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Assets", icon: Database, href: "/dashboard/assets" },
    { label: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
    { label: "New Post", icon: Video, href: "/editor" },
  ];

  return (
    <aside style={{
      width: 260,
      background: "#ffffff",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", padding: "24px" }}>
        <Link href="/" style={{ display: "block", width: "100%" }}>
          <img 
            src="/logo-transparent.png" 
            alt="twenty2short" 
            style={{ width: "100%", height: "auto", objectFit: "contain" }}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 12px", marginBottom: 4 }}>
          Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 10,
                background: isActive ? "rgba(0, 192, 212, 0.1)" : "transparent",
                color: isActive ? "#00C0D4" : "#4b5563",
                border: `1px solid ${isActive ? "rgba(0, 192, 212, 0.2)" : "transparent"}`,
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#e5e7eb";
                  e.currentTarget.style.color = "#0F2347";
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#4b5563";
                }
              }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "#00C0D4" : "currentColor"} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div style={{ padding: "24px 20px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#d1d5db" }} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#4b5563" }}>{user?.fullName || "My Account"}</span>
            <span style={{ fontSize: 12, color: "#00C0D4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{currentPlan}</span>
          </div>
        </div>
        <div style={{ position: "relative", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Settings size={18} color="#4b5563" />
          <div style={{ position: "absolute", inset: 0, opacity: 0.001, zIndex: 10 }}>
            <UserButton appearance={{ elements: { userButtonAvatarBox: { width: "26px", height: "26px", cursor: "pointer" } } }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
