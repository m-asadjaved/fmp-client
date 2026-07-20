import React from 'react';
import { Scissors, Maximize, Puzzle, Cloud } from 'lucide-react';

const FEATURES = [
  { icon: <Scissors className="w-5 h-5 text-brand-primary" />, title: 'AI Auto-Captions', desc: 'Transcribe audio in 30+ languages instantly with flawless burn-in stylized text overlays.', colSpan: 'md:col-span-2', gradient: 'from-[#533afd]/10 to-transparent', showMockup: true },
  { icon: <Maximize className="w-5 h-5 text-[#ff6118]" />, title: 'Smart Canvas Resize', desc: 'Auto-reframe any video composition into 9:16 Shorts, 1:1 square, or 16:9 formats.', colSpan: 'md:col-span-1', gradient: 'from-[#ff6118]/10 to-transparent', showMockup: false },
  { icon: <Puzzle className="w-5 h-5 text-[#A855F7]" />, title: 'Creator Plugin Store', desc: 'Supercharge edits with background removers, realistic AI voiceovers, and sound effects.', colSpan: 'md:col-span-1', gradient: 'from-[#A855F7]/10 to-transparent', showMockup: false },
  { icon: <Cloud className="w-5 h-5 text-[#14B8A6]" />, title: 'Cloud Project Library', desc: 'Save project files securely online. Edit, collaborate, and cut from any machine, anywhere.', colSpan: 'md:col-span-2', gradient: 'from-[#14B8A6]/10 to-transparent', showMockup: true },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 bg-brand-surfaceBg px-4 relative overflow-hidden">
      {/* Subtle Background Glows for Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none -z-10 opacity-40 mix-blend-multiply blur-[100px]">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#533afd] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-[#14B8A6] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 relative">
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-micro-label text-brand-primary uppercase tracking-[0.1px] shadow-sm-bottom">Features</div>
          <h2 className="text-[32px] md:text-[54px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.05] mb-5 text-balance mx-auto max-w-3xl">
            Everything a creator needs
          </h2>
          <p className="text-[18px] text-brand-on-surface-variant max-w-2xl mx-auto font-[300] leading-[26px]">
            Powerful workflow components that stay out of your way. Let AI handle the tedious tasks while you focus on creativity.
          </p>
        </div>
        
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px] lg:auto-rows-[360px]">
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={`relative group bg-white/70 backdrop-blur-xl rounded-xl border border-brand-border-subtle shadow-md-card hover:shadow-lg-card transition-all duration-300 overflow-hidden ${feature.colSpan} hover:-translate-y-1 cursor-default`}>
              
              {/* Internal Gradient Glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative h-full flex flex-col p-8 z-10">
                <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center shrink-0 border border-brand-border-subtle shadow-sm-bottom mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                
                <h3 className="text-[20px] font-[400] text-brand-secondary mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-brand-on-surface-variant leading-[24px] text-[15px] font-[300] max-w-sm">
                  {feature.desc}
                </p>

                {/* Decorative Mockups for large cards */}
                {feature.showMockup && idx === 0 && (
                  <div className="absolute right-[-20px] bottom-[-20px] w-64 h-40 bg-white rounded-xl border border-brand-border-subtle shadow-xl-popover overflow-hidden opacity-90 group-hover:opacity-100 transition-opacity rotate-[-2deg] group-hover:rotate-0 translate-y-4 group-hover:translate-y-0 duration-500">
                    <div className="w-full h-6 bg-brand-surfaceBg border-b border-brand-border-subtle flex items-center px-3 gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-brand-primary/10 rounded w-3/4" />
                      <div className="h-4 bg-brand-surfaceBg rounded w-full" />
                      <div className="h-4 bg-brand-surfaceBg rounded w-5/6" />
                    </div>
                  </div>
                )}

                {feature.showMockup && idx === 3 && (
                  <div className="absolute right-[-10px] bottom-0 w-72 h-32 bg-white rounded-t-xl border border-brand-border-subtle shadow-hero-float overflow-hidden opacity-90 group-hover:opacity-100 transition-opacity translate-y-6 group-hover:translate-y-2 duration-500 flex p-3 gap-3">
                    <div className="w-1/3 h-full bg-brand-surfaceBg rounded-md border border-brand-border-subtle" />
                    <div className="w-1/3 h-full bg-[#14B8A6]/20 rounded-md border border-[#14B8A6]/30 flex items-center justify-center">
                      <Cloud className="w-6 h-6 text-[#14B8A6]" />
                    </div>
                    <div className="w-1/3 h-full bg-brand-surfaceBg rounded-md border border-brand-border-subtle" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
