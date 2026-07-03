const fs = require('fs');

const path = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the `<aside>` block
const asideStart = content.indexOf('<aside');
const asideEnd = content.indexOf('</aside>') + 8;
if (asideStart !== -1 && asideEnd > asideStart) {
  content = content.substring(0, asideStart) + content.substring(asideEnd);
}

// 2. Remove the outer layout wrappers since layout.jsx handles it
// The top div is `<div className="min-h-screen bg-brand-background text-brand-on-surface font-sans flex">`
content = content.replace(/<div className="min-h-screen bg-brand-background text-brand-on-surface font-sans flex">/, '<div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>');

// The main wrapper is `<main className="flex-1 overflow-y-auto max-w-[1280px] mx-auto w-full px-12 py-8">`
content = content.replace(/<main className="flex-1 overflow-y-auto max-w-\[1280px\] mx-auto w-full px-12 py-8">/, '<main style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "32px 48px" }}>');

// 3. Replace all header classes
content = content.replace(/<header className="flex justify-between items-center mb-8 pb-4 border-b border-brand-border-subtle">/, '<header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid #27272a" }}>');
content = content.replace(/<h2 className="text-xl font-semibold tracking-tight">/, '<h2 style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", margin: 0, letterSpacing: "-0.03em" }}>');
content = content.replace(/<span className="text-neutral-300">\/<\/span>/, '<span style={{ color: "#3f3f46" }}>/</span>');
content = content.replace(/className="text-xs font-semibold text-brand-primary hover:underline font-mono"/, 'style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", fontFamily: "monospace", background: "none", border: "none", cursor: "pointer" }}');
content = content.replace(/<p className="text-sm font-semibold text-brand-on-surface leading-none">/, '<p style={{ fontSize: 14, fontWeight: 600, color: "#fafafa", margin: 0 }}>');
content = content.replace(/<p className="text-xs text-brand-on-surface-variant">/, '<p style={{ fontSize: 12, color: "#a1a1aa", margin: 0, marginTop: 4 }}>');
content = content.replace(/className="w-10 h-10 rounded-full object-cover border border-brand-border-subtle"/, 'style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid #27272a" }}');

// Badge colors
content = content.replace(/bg-blue-50 text-brand-primary border-blue-200/, 'bg-[rgba(124,58,237,0.1)] text-[#a78bfa] border-[rgba(124,58,237,0.2)]');
content = content.replace(/bg-\[#e2fbf4\] text-brand-vibrant-teal border-\[#b2f2e1\]/, 'bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[rgba(74,222,128,0.2)]');
content = content.replace(/bg-brand-surfaceBg text-brand-on-surface-variant border-brand-border-subtle/, 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]');

// Phase: PREVIEW text colors
content = content.replace(/<h3 className="text-xl font-bold text-brand-on-surface mb-1">/, '<h3 style={{ fontSize: 20, fontWeight: 800, color: "#fafafa", marginBottom: 4 }}>');
content = content.replace(/<p className="text-sm text-brand-on-surface-variant font-mono">/, '<p style={{ fontSize: 14, color: "#a1a1aa", fontFamily: "monospace", margin: 0 }}>');
content = content.replace(/<span className="text-brand-primary font-semibold">/, '<span style={{ color: "#a78bfa", fontWeight: 600 }}>');

// Cards
content = content.replace(/className="bg-white border border-brand-border-subtle rounded-lg overflow-hidden shadow-sm"/, 'style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}');
content = content.replace(/className="p-6 border-t border-brand-border-subtle bg-white"/, 'style={{ padding: 24, borderTop: "1px solid #27272a", background: "#18181b" }}');

// Inline badge
content = content.replace(/className="inline-flex items-center gap-1\.5 text-brand-primary text-xs font-semibold bg-brand-surfaceBg px-2\.5 py-1 rounded mb-4"/, 'style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 12, fontWeight: 600, background: "rgba(124, 58, 237, 0.1)", padding: "4px 10px", borderRadius: 6, marginBottom: 16 }}');
content = content.replace(/className="text-brand-neon-purple animate-pulse"/, 'style={{ color: "#c4b5fd" }} className="animate-pulse"');

// Checkboxes
content = content.replace(/bg-slate-50 border-brand-primary\/50/g, 'bg-[rgba(124,58,237,0.05)] border-[rgba(124,58,237,0.5)]');
content = content.replace(/bg-\[var\(--surface-bg\)\] border-brand-border-subtle hover:bg-slate-50/g, 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a]');
content = content.replace(/bg-\[var\(--primary\)\] text-white/g, 'bg-[#7c3aed] text-white');
content = content.replace(/bg-\[var\(--border-subtle\)\] bg-white/g, 'bg-[#27272a] bg-[#18181b]');
content = content.replace(/text-brand-on-surface font-semibold/g, 'text-[#fafafa] font-semibold');
content = content.replace(/text-brand-on-surface-variant/g, 'text-[#a1a1aa]');

// Action Button
content = content.replace(/bg-\[var\(--surface-bg\)\] text-brand-on-surface-variant cursor-not-allowed border border-brand-border-subtle/g, 'bg-[#27272a] text-[#71717a] cursor-not-allowed border-[#3f3f46]');
content = content.replace(/button text-white shadow-sm/g, 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg');

// PROCESSING/DONE Phase Cards
content = content.replace(/className="lg:col-span-2 bg-white border border-brand-border-subtle rounded-lg p-6 flex flex-col justify-between min-h-\[480px\] shadow-sm"/, 'style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} className="lg:col-span-2"');
content = content.replace(/className="bg-white border border-brand-border-subtle rounded-lg p-5 flex flex-col justify-between min-h-\[480px\] shadow-sm"/, 'style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}');

content = content.replace(/border-b border-brand-border-subtle pb-4 mb-6/g, 'border-b border-[#27272a] pb-4 mb-6');
content = content.replace(/border-b border-brand-border-subtle pb-2/g, 'border-b border-[#27272a] pb-2');
content = content.replace(/border-t border-brand-border-subtle/g, 'border-t border-[#27272a]');

// Typography
content = content.replace(/text-brand-on-surface/g, 'text-[#fafafa]');
content = content.replace(/text-brand-primary/g, 'text-[#a78bfa]');
content = content.replace(/text-brand-vibrant-teal/g, 'text-[#4ade80]');
content = content.replace(/bg-[#e2fbf4]/g, 'bg-[rgba(74,222,128,0.1)]');
content = content.replace(/border-[#b2f2e1]/g, 'border-[rgba(74,222,128,0.2)]');

content = content.replace(/bg-brand-surfaceBg/g, 'bg-[#18181b]');
content = content.replace(/border-brand-border-subtle/g, 'border-[#27272a]');

// Canvas
content = content.replace(/bg-white w-16 h-16 rounded-lg/g, 'bg-[#27272a] w-16 h-16 rounded-xl');

// Logs
content = content.replace(/text-slate-400 italic/g, 'text-[#71717a] italic');
content = content.replace(/border-slate-300/g, 'border-[#3f3f46]');

// Buttons
content = content.replace(/bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold shadow-sm/g, 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg');

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated clips page theme");
