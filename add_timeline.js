const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import VideoTimelineScrubber
if (!content.includes('import VideoTimelineScrubber')) {
  content = content.replace(
    'import GeneratedClipPreview from "./GeneratedClipPreview";',
    'import GeneratedClipPreview from "./GeneratedClipPreview";\nimport VideoTimelineScrubber from "./VideoTimelineScrubber";'
  );
}

// 2. Add trimRange state
if (!content.includes('const [trimRange')) {
  content = content.replace(
    'const [videoDuration, setVideoDuration] = useState(60);',
    'const [videoDuration, setVideoDuration] = useState(60);\n\tconst [trimRange, setTrimRange] = useState([0, 60]);'
  );
  
  // Update trimRange when videoDuration is loaded
  content = content.replace(
    'setVideoDuration(videoData.duration || 60);',
    'setVideoDuration(videoData.duration || 60);\n\t\t\t\tsetTrimRange([0, videoData.duration || 60]);'
  );
}

// 3. Update startProcessing payload
content = content.replace(
  'body: JSON.stringify({ preferences, regenerate: isRegenerating }),',
  'body: JSON.stringify({ preferences, trimRange, regenerate: isRegenerating }),'
);

// 4. Render the scrubber
const scrubberCode = `
							{/* Video Timeline Scrubber */}
							<div className="px-6 pb-2 pt-4 bg-[#f9fafb] border-t border-[#e5e7eb]">
								<VideoTimelineScrubber 
									videoRef={videoRef} 
									duration={videoDuration} 
									trimRange={trimRange} 
									onChange={setTrimRange} 
								/>
							</div>
`;

if (!content.includes('<VideoTimelineScrubber')) {
  content = content.replace(
    'Your browser does not support the video tag.\n\t\t\t\t\t\t\t\t</video>\n\t\t\t\t\t\t\t</div>',
    'Your browser does not support the video tag.\n\t\t\t\t\t\t\t\t</video>\n\t\t\t\t\t\t\t</div>\n' + scrubberCode
  );
}

// 5. Change the button gradient
content = content.replace(
  /className="[^"]*bg-\[#0F2347\][^"]*Start AI Processing[^"]*"/g,
  (match) => {
    return match.replace(
      'bg-[#0F2347] hover:bg-[#1e3a8a]',
      'bg-gradient-to-r from-[#A855F7] to-[#ff6118]'
    );
  }
);

// Second attempt at fixing button if regex fails
if (content.includes('bg-[#0F2347] hover:bg-[#1e3a8a] text-white shadow-lg')) {
  content = content.replace(
    'bg-[#0F2347] hover:bg-[#1e3a8a] text-white shadow-lg',
    'bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white shadow-lg'
  );
}

fs.writeFileSync(file, content);
console.log('done_timeline');
