const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `							<div>
								<h3 className="text-[#0F2347] font-bold text-sm">Regenerate Clips</h3>
								<p className="text-[#4b5563] text-xs mt-1">If you aren't satisfied, you can re-run the analysis to discover new segments.</p>
							</div>
							<button
								onClick={() => {
									setPhase("preview");
									setAiAnalysis(null);
									setIsRegenerating(true);
								}}
								className="bg-[#0F2347] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:bg-[#1e3a8a]"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
									<path d="M3 3v5h5" />
								</svg>
								Start New Analysis
							</button>`;

const replacement1 = `							<div>
								<h3 className="text-[#0F2347] font-bold text-sm">Want to regenerate clips?</h3>
								<p className="text-[#4b5563] text-xs mt-1">You can re-run the AI analysis to discover new segments. <span className="text-amber-600 font-semibold">Warning: This will consume credits again.</span></p>
							</div>
							<button
								onClick={() => {
									setPhase("preview");
									setAiAnalysis(null);
									setIsRegenerating(true);
								}}
								className="bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-[1px] active:scale-[0.98]"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
									<path d="M3 3v5h5" />
								</svg>
								Regenerate Clips
							</button>`;

const target2 = `				{/* FOOTER EXTERNAL REFERENCES */}
				<footer className="mt-16 pt-6 border-t border-[#e5e7eb] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#4b5563]">
					<div>ClipAI&copy; 2026 ClipAI Inc. All rights reserved.</div>
					<div className="flex gap-4">
						<a href="#" className="hover:text-[#0F2347] transition-colors">Privacy Policy</a>
						<a href="#" className="hover:text-[#0F2347] transition-colors">Terms of Service</a>
						<a href="#" className="hover:text-[#0F2347] transition-colors flex items-center gap-1">
							Security Node <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
						</a>
					</div>
				</footer>`;

content = content.replace(target1, replacement1);
content = content.replace(target2, '');

fs.writeFileSync(file, content);
console.log('done');
