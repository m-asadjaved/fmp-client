"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Video, Settings, Database, Subtitles, PlusSquare } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "AI Viral Shorts", icon: Video, href: "/dashboard" },
    { label: "Assets", icon: Database, href: "/dashboard/assets" },
    { label: "Subtitle Generator", icon: Subtitles, href: "/dashboard/subtitles" },
    { label: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
  ];

  const accountItem = { label: "Account", icon: Settings, href: "/dashboard/account" };

  return (
    <aside className="w-[260px] bg-[var(--surface)] border-r border-[#e2e8f0] flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 relative">
      {/* Brand */}
      <div className="flex items-center px-8 py-8">
        <Link href="/" className="block w-full transition-transform hover:scale-105 duration-300">
          <img 
            src="/logo-transparent.png" 
            alt="twenty2short" 
            className="w-2/3 mx-auto h-auto object-contain brightness-0 drop-shadow-sm"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1.5 mt-2">
        <div className="text-[11px] font-bold text-[var(--on-surface-variant)] uppercase tracking-[0.1em] px-4 mb-3">
          Menu
        </div>
        {NAV_ITEMS.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <React.Fragment key={item.href}>
              <Link href={item.href} className="group outline-none">
                <div className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 border ${
                  isActive 
                    ? "bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white border-transparent shadow-md" 
                    : "bg-transparent text-[var(--on-surface-variant)] border-transparent hover:bg-[var(--surface-bg)] hover:text-[var(--on-surface)] hover:shadow-sm"
                }`}>
                  <item.icon 
                    size={18} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={`transition-colors duration-300 ${isActive ? "text-white" : "text-[var(--on-surface-variant)] group-hover:text-[#ff6118]"}`}
                  />
                  <span className={`text-[14px] transition-all duration-300 ${isActive ? "font-bold" : "font-semibold"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
              {idx < NAV_ITEMS.length - 1 && (
                <div className="h-px bg-[#e2e8f0] my-1 mx-3" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Account - Bottom Pinned */}
      <div className="mx-4 mb-6 mt-auto p-4 bg-[var(--surface-bg)] rounded-2xl border border-[var(--border-subtle)]/50 shadow-sm">
        <Link href={accountItem.href} className="group outline-none">
          <div className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 border ${
            pathname === accountItem.href 
              ? "bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white border-transparent shadow-md" 
              : "bg-[var(--surface)] text-[var(--on-surface-variant)] border-[var(--border-subtle)] hover:border-transparent hover:shadow-md hover:-translate-y-0.5 hover:text-[var(--on-surface)]"
          }`}>
            <accountItem.icon 
              size={18} 
              strokeWidth={pathname === accountItem.href ? 2.5 : 2} 
              className={`transition-colors duration-300 ${pathname === accountItem.href ? "text-white" : "text-[var(--on-surface-variant)] group-hover:text-[#A855F7]"}`}
            />
            <span className={`text-[14px] transition-all duration-300 ${pathname === accountItem.href ? "font-bold" : "font-semibold"}`}>
              {accountItem.label}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
