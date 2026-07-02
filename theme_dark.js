const fs = require('fs');
let code = fs.readFileSync('app/components/CaptionEditor.jsx', 'utf8');

// 1. Reset palettes to INDIGO
code = code.replace(/BLUE/g, 'INDIGO');
code = code.replace(/Blue/g, 'Indigo');

code = code.replace(/const INDIGO = ".+?";/, 'const INDIGO = "#6366f1";');
code = code.replace(/const INDIGO_DIM = ".+?";/, 'const INDIGO_DIM = "rgba(99,102,241,0.6)";');
code = code.replace(/const INDIGO_GLOW = ".+?";/, 'const INDIGO_GLOW = "rgba(99,102,241,0.35)";');
code = code.replace(/const INDIGO_SOFT = ".+?";/, 'const INDIGO_SOFT = "rgba(99,102,241,0.1)";');
code = code.replace(/const INDIGO_BORDER = ".+?";/, 'const INDIGO_BORDER = "rgba(99,102,241,0.25)";');

// 2. Fix the corrupted backgrounds and borders.

// Main wrapper
code = code.replace(/background: "#f3f4f6", color: "#111827"/g, 'background: "#09090b", color: "#fafafa"');

// Left sidebar
code = code.replace(/borderRight: `1px solid #111827`, background: "#ffffff"/g, 'borderRight: `1px solid #27272a`, background: "#18181b"');
code = code.replace(/padding: "16px 20px", borderBottom: `1px solid #111827`,\s*background: "#ffffff"/g, 'padding: "16px 20px", borderBottom: `1px solid #27272a`,\n          background: "#18181b"');

// Main text
code = code.replace(/color: "#111827"/g, 'color: "#fafafa"');

// Panels inside sidebar
code = code.replace(/background: "rgba\(255,255,255,0\.03\)"/g, 'background: "rgba(255,255,255,0.03)"');
code = code.replace(/background: "#f9fafb"/g, 'background: "#27272a"');
code = code.replace(/border: `1px solid #111827`/g, 'border: `1px solid #3f3f46`');
code = code.replace(/background: "#f9fafb", border: `1px solid #111827`/g, 'background: "#27272a", border: `1px solid #3f3f46`');

// Headers & Texts
code = code.replace(/color: "#1e3a8a"/g, 'color: "#a5b4fc"'); // Dark text label
code = code.replace(/color: "#4b5563"/g, 'color: "#a1a1aa"'); // Secondary text
code = code.replace(/color: "#6b7280"/g, 'color: "#71717a"'); // Muted text

// Center workspace
code = code.replace(/background: "#e5e7eb"/g, 'background: "#000000"');
code = code.replace(/boxShadow: `0 0 0 1px #111827, 0 24px 64px rgba\(0,0,0,0\.15\)`/g, 'boxShadow: `0 0 0 1px #27272a, 0 24px 64px rgba(0,0,0,0.8)`');
code = code.replace(/linear-gradient\(#d1d5db 1px/g, 'linear-gradient(#27272a 1px');

// Right sidebar
code = code.replace(/borderLeft: `1px solid #111827`, background: "#ffffff"/g, 'borderLeft: `1px solid #27272a`, background: "#18181b"');

// Live transcript
code = code.replace(/borderTop: `1px solid #111827`, background: "#f3f4f6"/g, 'borderTop: `1px solid #27272a`, background: "#09090b"');
code = code.replace(/padding: "16px 20px", borderBottom: `1px solid #111827`,\s*background: "#ffffff"/g, 'padding: "16px 20px", borderBottom: `1px solid #27272a`,\n        background: "#18181b"');

// Active caption
code = code.replace(/border: `1px solid \$\{isActive \? INDIGO_BORDER : "#111827"\}`/g, 'border: `1px solid ${isActive ? INDIGO_BORDER : "#27272a"}`');
code = code.replace(/background: isActive \? "rgba\(37,99,235,0\.03\)" : "#111827"/g, 'background: isActive ? "rgba(99,102,241,0.06)" : "#18181b"');
code = code.replace(/color: isActive \? "#fafafa" : "#4b5563"/g, 'color: isActive ? "#fafafa" : "#a1a1aa"');

// Buttons & Gradients
code = code.replace(/background: isExporting \? "rgba\(37,99,235,0\.4\)" : `linear-gradient\(135deg, \$\{INDIGO\}, #1d4ed8\)`/g, 'background: isExporting ? "rgba(99,102,241,0.4)" : `linear-gradient(135deg, ${INDIGO}, #4338ca)`');
code = code.replace(/background: "rgba\(37,99,235,0\.12\)", border: "1px solid rgba\(37,99,235,0\.3\)"/g, 'background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)"');

// Default States
code = code.replace(/setActiveWordColor\("#2563eb"\)/g, 'setActiveWordColor("#6366f1")');
code = code.replace(/useState\("#2563eb"\)/g, 'useState("#6366f1")');
code = code.replace(/fill="#1e3a8a"/g, 'fill="#a5b4fc"');
code = code.replace(/fill="#111827"/g, 'fill="#fafafa"'); // icons

// Fix text area backgrounds that broke
code = code.replace(/background: "transparent", border: "none", color: isActive \? "#fafafa" : "#4b5563"/g, 'background: "transparent", border: "none", color: isActive ? "#fafafa" : "#a1a1aa"');

fs.writeFileSync('app/components/CaptionEditor.jsx', code);
console.log("Studio Dark theme applied successfully!");
