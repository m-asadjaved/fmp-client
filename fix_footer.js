const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/page.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        <footer style={{ margin: "64px -40px 0 -40px", padding: "40px 40px 20px 40px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 40, fontSize: 13, color: "var(--on-surface-variant)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "var(--on-surface)", fontSize: 18 }}>ClipAI</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>PRO</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5, maxWidth: 300 }}>
              The ultimate AI video clipping workspace. Transform long-form content into viral clips in seconds.
            </p>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }}></div>
              <span>All systems operational</span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ margin: 0, color: "var(--on-surface)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Platform</h4>
              <Link href="/dashboard" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Home</Link>
              <Link href="/dashboard/assets" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Assets Library</Link>
              <Link href="/dashboard/settings" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Account Settings</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ margin: 0, color: "var(--on-surface)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Resources</h4>
              <a href="#" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Documentation</a>
              <a href="#" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Video Tutorials</a>
              <a href="#" style={{ color: "var(--on-surface-variant)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="var(--primary)"} onMouseOut={e => e.currentTarget.style.color="var(--on-surface-variant)"}>Support Ticket</a>
            </div>
          </div>
        </footer>`;

const replacement = `        <footer className="border-t border-[#e5e7eb] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#4b5563]" style={{ margin: "64px -40px 0 -40px", padding: "24px 40px", background: "var(--surface-bg)" }}>
          <div>ClipAI&copy; 2026 ClipAI Inc. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#0F2347] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#0F2347] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#0F2347] transition-colors flex items-center gap-1">
              Security Node <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
            </a>
          </div>
        </footer>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('done2');
