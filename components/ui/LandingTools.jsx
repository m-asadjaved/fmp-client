import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

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
    <section className="py-24 relative overflow-hidden bg-brand-surfaceBg">
      {/* Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] opacity-30 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent blur-[100px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium mb-6 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-4 h-4" />
            <span>The Roadmap</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-brand-secondary mb-6">
            All other features <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
              coming soon
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-brand-on-surface-variant max-w-2xl leading-relaxed font-light">
            We are building the ultimate suite of AI-powered tools. 
            Clip, caption, edit, and publish short-form video content at lightning speed.
          </p>
        </div>
        
        {/* Tools Grid */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-5xl mx-auto">
          {TOOLS_LIST.map((tool, idx) => (
            <div 
              key={idx} 
              className="group relative px-4 py-2.5 bg-brand-surface/50 border border-brand-border-subtle hover:border-purple-500/40 rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:-translate-y-0.5 backdrop-blur-sm cursor-default flex items-center gap-2"
            >
              <Clock className="w-3.5 h-3.5 text-brand-on-surface-variant/40 group-hover:text-purple-500/80 transition-colors" />
              <span className="text-sm font-medium text-brand-on-surface-variant group-hover:text-brand-secondary transition-colors">
                {tool}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
