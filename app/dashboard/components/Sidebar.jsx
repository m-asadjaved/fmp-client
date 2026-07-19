"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Video, Settings, Database } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Assets", icon: Database, href: "/dashboard/assets" },
    { label: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
    { label: "New Post", icon: Video, href: "/editor" },
    { label: "Account", icon: Settings, href: "/dashboard/account" },
  ];

  return (
    <aside className="w-[260px] bg-[var(--surface)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 relative">
      {/* Brand */}
      <div className="flex items-center px-8 py-8">
        <Link href="/" className="block w-full transition-transform hover:scale-105 duration-300">
          <img 
            src="/logo-transparent.png" 
            alt="twenty2short" 
            className="w-full h-auto object-contain drop-shadow-sm"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1.5 mt-2">
        <div className="text-[11px] font-bold text-[var(--on-surface-variant)] uppercase tracking-[0.1em] px-4 mb-3">
          Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="group outline-none">
              <div className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 border ${
                isActive 
                  ? "bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30 shadow-sm" 
                  : "bg-transparent text-[var(--on-surface-variant)] border-transparent hover:bg-[var(--surface-bg)] hover:text-[var(--on-surface)] hover:shadow-sm"
              }`}>
                <item.icon 
                  size={18} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={`transition-colors duration-300 ${isActive ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]"}`}
                />
                <span className={`text-[14px] transition-all duration-300 ${isActive ? "font-bold" : "font-semibold"}`}>
                  {item.label}
                </span>
                
                {/* Optional Active Indicator Pill */}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(0,192,212,0.8)]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
