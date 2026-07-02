const fs = require('fs');
let code = fs.readFileSync('app/components/CaptionEditor.jsx', 'utf8');

// Replace palettes
code = code.replace(/LIME/g, 'BLUE');
code = code.replace(/Lime/g, 'Blue');
code = code.replace(/Lime palette/g, 'Blue palette');

code = code.replace(/const BLUE = ".+?";/, 'const BLUE = "#2563eb";');
code = code.replace(/const BLUE_DIM = ".+?";/, 'const BLUE_DIM = "rgba(37,99,235,0.8)";');
code = code.replace(/const BLUE_GLOW = ".+?";/, 'const BLUE_GLOW = "rgba(37,99,235,0.25)";');
code = code.replace(/const BLUE_SOFT = ".+?";/, 'const BLUE_SOFT = "rgba(37,99,235,0.08)";');
code = code.replace(/const BLUE_BORDER = ".+?";/, 'const BLUE_BORDER = "rgba(37,99,235,0.2)";');

// Specific text colors
code = code.replace(/#4d5f2e/g, '#1e3a8a'); // Dark text label

// UI Backgrounds
code = code.replace(/#0a0a0a/g, '#f3f4f6'); // Main bg
code = code.replace(/#111111/g, '#ffffff'); // Sidebar bg
code = code.replace(/#050505/g, '#e5e7eb'); // Center workspace
code = code.replace(/#161616/g, '#f9fafb'); // Panels bg
code = code.replace(/rgba\(163,230,53,0\.04\)/g, 'rgba(37,99,235,0.04)');
code = code.replace(/rgba\(163,230,53,0\.03\)/g, 'rgba(37,99,235,0.03)');

// Borders
code = code.replace(/#222/g, '#e5e7eb');
code = code.replace(/#2a2a2a/g, '#d1d5db');

// Text Colors
code = code.replace(/#e5e7eb/g, '#111827'); // Main text
code = code.replace(/#f9fafb/g, '#111827');
code = code.replace(/color: "#fff"/g, 'color: "#111827"');
code = code.replace(/color: "#ffffff"/g, 'color: "#111827"');
code = code.replace(/color: "white"/g, 'color: "#111827"');
code = code.replace(/color: isActive \? "#fff" : "#d1d5db"/g, 'color: isActive ? "#111827" : "#6b7280"');
code = code.replace(/color: isActive \? BLUE_DIM : "#6b7280"/g, 'color: isActive ? BLUE_DIM : "#9ca3af"');
code = code.replace(/#9ca3af/g, '#4b5563'); // Secondary text
code = code.replace(/#666/g, '#6b7280'); // Monitor text
code = code.replace(/color: "#d9f99d"/g, 'color: "#1e3a8a"');
code = code.replace(/fill="#d9f99d"/g, 'fill="#1e3a8a"');
code = code.replace(/color: "#374151"/g, 'color: "#4b5563"');

// Export button gradients
code = code.replace(/#65a30d/g, '#1d4ed8'); // gradient end
code = code.replace(/#080b05/g, '#ffffff'); // export button text
code = code.replace(/rgba\(8,11,5,0\.7\)/g, 'rgba(255,255,255,0.8)');

// Grid lines
code = code.replace(/linear-gradient\(#111 1px/g, 'linear-gradient(#d1d5db 1px');
code = code.replace(/linear-gradient\(90deg, #111 1px/g, 'linear-gradient(90deg, #d1d5db 1px');

// Icons & Accents
code = code.replace(/background: "rgba\(255,255,255,0\.08\)"/g, 'background: "rgba(0,0,0,0.08)"');
code = code.replace(/background: "rgba\(255,255,255,0\.03\)"/g, 'background: "#f9fafb"');
code = code.replace(/rgba\(255,255,255,0\.15\)/g, 'rgba(0,0,0,0.1)');
code = code.replace(/rgba\(255,255,255,0\.025\)/g, '#ffffff');
code = code.replace(/rgba\(0,0,0,0\.8\)/g, 'rgba(0,0,0,0.15)'); // player shadow
code = code.replace(/background: "transparent", border: "none", color: isActive \? "#fff" : "#d1d5db"/g, 'background: "transparent", border: "none", color: isActive ? "#111827" : "#4b5563"');
code = code.replace(/background: "none", padding: 2/g, 'background: "#fff", padding: 2');
code = code.replace(/background: "none", padding/g, 'background: "#fff", padding');

// Default states
code = code.replace(/setActiveWordColor\("#a3e635"\)/, 'setActiveWordColor("#2563eb")');
code = code.replace(/const activeWordColor = "#a3e635"/g, 'const activeWordColor = "#2563eb"');

fs.writeFileSync('app/components/CaptionEditor.jsx', code);
console.log("Theme changed successfully!");
