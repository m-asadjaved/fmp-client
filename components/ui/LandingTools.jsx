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
    <section className="py-20 bg-brand-surfaceBg px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 md:mb-16">
          <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4 text-center md:text-left">
            twenty2short Tools
          </h2>
          <p className="text-[16px] text-brand-on-surface-variant max-w-3xl text-center md:text-left font-[300] leading-[22.4px]">
            AI-powered tools to clip, caption, edit, and publish short-form video content. Built for creators who need speed and volume.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          {TOOLS_LIST.map((tool, idx) => (
            <a 
              key={idx} 
              href="#" 
              className="px-4 py-2 bg-brand-surface border border-brand-border-subtle rounded-md text-label-small text-brand-secondary hover:border-brand-primary hover:text-brand-primary transition-colors shadow-sm-bottom"
            >
              {tool}
            </a>
          ))}
          <a 
            href="#" 
            className="px-4 py-2 bg-brand-surface border border-brand-border-subtle rounded-md text-label-small text-brand-on-surface-variant hover:text-brand-secondary transition-colors shadow-sm-bottom"
          >
            All Tools →
          </a>
        </div>
      </div>
    </section>
  );
}
