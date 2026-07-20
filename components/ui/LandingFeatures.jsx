import React from 'react';
import { Scissors, Focus, MessageSquare, Globe, Zap, Gamepad2 } from 'lucide-react';

const FEATURES = [
  { 
    icon: <Scissors className="w-5 h-5 text-[#533afd]" />, 
    title: 'Auto Curation', 
    desc: 'AI automatically detects viral-worthy moments in your video and turns them into short clips.', 
    altText: 'Ssemble Auto Curation — AI automatically detects viral moments and creates short clips',
    gradient: 'from-[#533afd]/10 to-transparent',
    mediaType: 'video',
    mediaSrc: '/dummy.mp4'
  },
  { 
    icon: <Focus className="w-5 h-5 text-[#ff6118]" />, 
    title: 'Face Tracking', 
    desc: 'AI detects faces in your video and keeps them centered in vertical formats.', 
    altText: 'Ssemble Face Tracking — AI keeps faces centered in vertical short-form formats',
    gradient: 'from-[#ff6118]/10 to-transparent',
    mediaType: 'image',
    mediaSrc: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=600&auto=format&fit=crop'
  },
  { 
    icon: <MessageSquare className="w-5 h-5 text-[#A855F7]" />, 
    title: 'Auto Captioning', 
    desc: 'AI listens to your video and automatically adds captions.', 
    altText: 'Ssemble Auto Captioning — AI listens to video and adds accurate captions',
    gradient: 'from-[#A855F7]/10 to-transparent',
    mediaType: 'video',
    mediaSrc: '/dummy.mp4'
  },
  { 
    icon: <Globe className="w-5 h-5 text-[#14B8A6]" />, 
    title: 'Caption Translation', 
    desc: 'Translate captions to different languages while keeping the original audio.', 
    altText: 'Ssemble Caption Translation — translate captions to 30+ languages while keeping original audio',
    gradient: 'from-[#14B8A6]/10 to-transparent',
    mediaType: 'image',
    mediaSrc: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=600&auto=format&fit=crop'
  },
  { 
    icon: <Zap className="w-5 h-5 text-[#d946ef]" />, 
    title: 'Hook Title & CTA', 
    desc: 'AI generates engaging hook titles and CTAs to keep viewers watching until the end.', 
    altText: 'Ssemble Hook Title and CTA — AI generates engaging hooks to boost retention',
    gradient: 'from-[#d946ef]/10 to-transparent',
    mediaType: 'image',
    mediaSrc: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=600&auto=format&fit=crop'
  },
  { 
    icon: <Gamepad2 className="w-5 h-5 text-[#0ea5e9]" />, 
    title: 'Game Video', 
    desc: 'Adds gameplay footage at the bottom to increase retention and keep viewers engaged.', 
    altText: 'Ssemble Game Video — adds gameplay footage at the bottom to increase viewer retention',
    gradient: 'from-[#0ea5e9]/10 to-transparent',
    mediaType: 'video',
    mediaSrc: '/dummy.mp4'
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="pt-8 pb-24 bg-brand-surfaceBg px-4 relative overflow-hidden">
      {/* Subtle Background Glows for Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none -z-10 opacity-40 mix-blend-multiply blur-[100px]">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#533afd] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-[#14B8A6] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 relative">
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-micro-label text-brand-primary uppercase tracking-[0.1px] shadow-sm-bottom">Features</div>
          <h2 className="text-[32px] md:text-[54px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.05] mb-5 text-balance mx-auto max-w-3xl">
            Everything you need to create viral clips
          </h2>
        </div>
        
        {/* Features Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {FEATURES.map((feature, idx) => (
            <div key={idx} className="relative group flex flex-col">
              <div className="relative flex flex-col z-10 flex-1">
                <h3 className="text-[24px] font-bold text-brand-secondary mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-brand-on-surface-variant leading-[26px] text-[16px] font-[300] mb-6 max-w-lg">
                  {feature.desc}
                </p>

                {/* Media Block (Images and Videos) */}
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative mt-auto shadow-sm transition-transform duration-500 group-hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-brand-surfaceBg/50 animate-pulse -z-10" />
                  {feature.mediaType === 'video' ? (
                    <video
                      src={feature.mediaSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={feature.mediaSrc} 
                      alt={feature.title} 
                      loading="lazy"
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
