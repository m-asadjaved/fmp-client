'use client';

import React from 'react';
import { MonitorPlay, Radar, Scissors, Share2, Coins } from 'lucide-react';

const steps = [
  {
    title: 'Connect Channel',
    description: "Paste your YouTube channel URL. That's it.",
    icon: <MonitorPlay className="w-8 h-8 text-[#ff0000]" />,
    color: 'from-[#ff0000]/20 to-[#ff0000]/5',
    solid: 'from-[#ff0000] to-[#ff4444]'
  },
  {
    title: 'Detect',
    description: 'We watch for new uploads 24/7 — no refresh needed.',
    icon: <Radar className="w-8 h-8 text-[#14B8A6]" />,
    color: 'from-[#14B8A6]/20 to-[#14B8A6]/5',
    solid: 'from-[#14B8A6] to-[#0d9488]'
  },
  {
    title: 'AI Clip',
    description: 'Our AI scores viral moments and cuts Shorts-ready clips.',
    icon: <Scissors className="w-8 h-8 text-[#A855F7]" />,
    color: 'from-[#A855F7]/20 to-[#A855F7]/5',
    solid: 'from-[#A855F7] to-[#9333ea]'
  },
  {
    title: 'Auto-Post',
    description: 'Qualifying clips auto-post to your connected YouTube channel, TikTok, and Instagram Reels.',
    icon: <Share2 className="w-8 h-8 text-[#ff6118]" />,
    color: 'from-[#ff6118]/20 to-[#ff6118]/5',
    solid: 'from-[#ff6118] to-[#ea580c]'
  }
];

export function LandingChannelAutomation() {
  return (
    <section className="py-24 px-4 bg-brand-surfaceBg relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#ff0000]/5 via-transparent to-[#A855F7]/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff0000]/10 text-[#ff0000] text-sm font-bold mb-4">
            <MonitorPlay className="w-4 h-4" />
            Hands-Off Automation
          </div>
          <h2 className="text-[32px] md:text-[48px] font-bold text-brand-secondary tracking-tight leading-[1.1] mb-6">
            YouTube Channel <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0000] to-[#ff6118]">Automation</span>
          </h2>
          <p className="text-[18px] text-brand-on-surface-variant font-[300] leading-relaxed">
            Channel Automation watches your YouTube channel, AI-clips new uploads, and auto-posts to your connected YouTube channel, TikTok, and Instagram Reels — hands-off.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-[3px] bg-gradient-to-r from-[#ff0000]/30 via-[#A855F7]/30 to-[#f59e0b]/30 z-0 rounded-full" />
          
          <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-4 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center flex-1 relative group">
                {/* Mobile connecting line */}
                {idx !== steps.length - 1 && (
                  <div className="block lg:hidden absolute top-24 bottom-[-48px] left-1/2 w-[2px] bg-gradient-to-b from-[#ff0000]/20 to-transparent -translate-x-1/2 z-0" />
                )}
                
                <div className={`w-24 h-24 rounded-full bg-white shadow-lg-card flex items-center justify-center mb-6 relative z-10 transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl-popover border border-white/50`}>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-tr ${step.solid} text-white flex items-center justify-center font-bold text-sm shadow-md border-[2px] border-white`}>
                    {idx + 1}
                  </div>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    {step.icon}
                  </div>
                </div>
                
                <h3 className="text-[18px] font-bold text-brand-secondary mb-3">{step.title}</h3>
                <p className="text-[14px] text-brand-on-surface-variant font-[300] leading-relaxed max-w-[200px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
