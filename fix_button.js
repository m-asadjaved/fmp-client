const fs = require('fs');
const file = 'd:/Code/fmp/fmp-client/app/dashboard/clips/v2/[videoId]/page.jsx';
let content = fs.readFileSync(file, 'utf8');

// The button has a few variations, I'll match anything that looks like the regenerate button
content = content.replace(/className="bg-\[#0F2347\][^"]*"/g, (match) => {
  if (match.includes("transition-all") || match.includes("flex items-center gap-2")) {
    return 'className="bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-[1px] active:scale-[0.98]"';
  }
  return match;
});

// Just in case it was changed to the other gradient by the fuzzy matcher:
content = content.replace(/className="bg-gradient-to-r from-\[#00C0D4\] to-\[#0F2347\][^"]*"/g, (match) => {
  return 'className="bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-[1px] active:scale-[0.98]"';
});

// For the text, I'll force it to what the user requested earlier using regex to match the inner HTML of the h3 and p
content = content.replace(/<h3 className="text-\[#0F2347\] font-bold text-sm">.*?<\/h3>/g, '<h3 className="text-[#0F2347] font-bold text-sm">Want to regenerate clips?</h3>');
content = content.replace(/<p className="text-\[#4b5563\] text-xs mt-1">.*?<\/p>/g, '<p className="text-[#4b5563] text-xs mt-1">You can re-run the AI analysis to discover new segments. <span className="text-amber-600 font-semibold">Warning: This will consume credits again.</span></p>');
content = content.replace(/Run New Analysis<\/button>/g, 'Regenerate Clips</button>');
content = content.replace(/Start New Analysis<\/button>/g, 'Regenerate Clips</button>');

// Remove footer just in case it's still there
content = content.replace(/\s*\{\/\* FOOTER EXTERNAL REFERENCES \*\/\}[\s\S]*?<\/footer>/, '');

fs.writeFileSync(file, content);
console.log('done_button');
