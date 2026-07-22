const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `</video>
							</div>`;
const replacement = `</video>
							</div>
							{/* Video Timeline Scrubber */}
							<div className="px-6 pb-2 pt-4 bg-[#f9fafb] border-t border-[#e5e7eb]">
								<VideoTimelineScrubber 
									videoRef={videoRef} 
									duration={videoDuration} 
									trimRange={trimRange} 
									onChange={setTrimRange} 
								/>
							</div>`;

if (!content.includes('<VideoTimelineScrubber')) {
  // It might have tabs so regex is safer
  content = content.replace(/<\/video>\s*<\/div>/, replacement);
  fs.writeFileSync(file, content);
  console.log('done_timeline_inject');
} else {
  console.log('already_injected');
}
