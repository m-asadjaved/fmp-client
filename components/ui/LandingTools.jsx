import React from 'react';

const TOOLS_LIST = [
  "YouTube Channel Automation", "Short Video Maker", "TikTok Video Maker", 
  "AI Video Editor", "YouTube Clips Maker", "Clipping Software", "Twitch Clipping Tool", 
  "YouTube Clipping Tool", "Clip Editor", "Clipping Tool", "AI Clipping", "Shorts Creator", 
  "Viral Clips", "Automatic Clips", "AI B-Roll Generator", "AI Caption Generator", 
  "AI Clip Maker", "AI Shorts Maker", "AI Video Clipper", "Instagram Reels Maker", 
  "Long Video to Shorts", "Podcast Clip Maker", "Smart Clipping", "TikTok Clip Maker", 
  "Twitch Clip Maker", "Vertical Video Maker", "Video Cropper", "Video Highlights", 
  "Video Repurposing Tool", "Video Shortener", "Video Trimmer", "Viral Video Maker", 
  "YouTube Shorts Maker"
];

export function LandingTools() {
  return (
    <section className="py-20 bg-gray-50 border-t border-gray-200 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F2347] tracking-tight mb-4 text-center md:text-left">
            twenty2short Tools
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl text-center md:text-left">
            AI-powered tools to clip, caption, edit, and publish short-form video content. Built for creators who need speed and volume.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          {TOOLS_LIST.map((tool, idx) => (
            <a 
              key={idx} 
              href="#" 
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#00C0D4] hover:text-[#00C0D4] transition-colors shadow-sm"
            >
              {tool}
            </a>
          ))}
          <a 
            href="#" 
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
          >
            All Tools →
          </a>
        </div>
      </div>
    </section>
  );
}
