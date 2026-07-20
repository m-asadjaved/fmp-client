import React from 'react';
import { Eye } from 'lucide-react';

const videosRow1 = [
  { mp4: "/dummy.mp4", id: 1, views: "1.2M" },
  { mp4: "/dummy.mp4", id: 2, views: "845K" },
  { mp4: "/dummy.mp4", id: 3, views: "2.1M" },
  { mp4: "/dummy.mp4", id: 4, views: "500K" },
  { mp4: "/dummy.mp4", id: 5, views: "3.4M" },
];

const videosRow2 = [
  { mp4: "/dummy.mp4", id: 6, views: "1.5M" },
  { mp4: "/dummy.mp4", id: 7, views: "920K" },
  { mp4: "/dummy.mp4", id: 8, views: "4.2M" },
  { mp4: "/dummy.mp4", id: 9, views: "750K" },
  { mp4: "/dummy.mp4", id: 10, views: "2.8M" },
];

// Duplicate enough times to ensure seamless infinite scroll across ultrawide monitors
const row1 = [...videosRow1, ...videosRow1, ...videosRow1, ...videosRow1];
const row2 = [...videosRow2, ...videosRow2, ...videosRow2, ...videosRow2];

export default function FloatingVideosPhysics() {
  return (
    <div className="relative w-[100vw] left-1/2 -translate-x-1/2 py-10 overflow-hidden bg-brand-surfaceBg mt-16 mb-0 shadow-inner">
      {/* Edge Fades for smooth entry/exit */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <div className="absolute left-0 top-0 w-[15%] md:w-[300px] h-full bg-gradient-to-r from-brand-surfaceBg to-transparent" />
        <div className="absolute right-0 top-0 w-[15%] md:w-[300px] h-full bg-gradient-to-l from-brand-surfaceBg to-transparent" />
      </div>

      <div className="text-center mb-16 relative z-20 px-4 pt-10">
        <div className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-3">AI Powered</div>
        <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4">
          Example Clips
        </h2>
        <p className="text-[16px] text-brand-on-surface-variant max-w-2xl mx-auto font-[300] leading-[22.4px]">
          Just extract the juicy moments from long videos and let the clips go viral.
        </p>
      </div>

      <div className="relative z-0 flex flex-col gap-8 w-full rotate-[-3deg] scale-[1.05]">
        {/* Row 1 - scrolling left */}
        <div className="flex w-max marquee-slider items-center gap-8 pl-8">
          {row1.map((video, idx) => (
            <div key={idx} className="relative w-[180px] md:w-[220px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg-card flex-shrink-0 bg-black group hover:-translate-y-2 transition-transform duration-300 border-[4px] border-white">
              <video
                src={video.mp4}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-10 shadow-sm">
                <Eye className="w-3.5 h-3.5 text-white/90" />
                <span className="text-white/90 text-xs font-medium tracking-wide">{video.views}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2 - scrolling right (using animation-direction: reverse) */}
        <div className="flex w-max marquee-slider items-center gap-8 pl-8" style={{ animationDirection: 'reverse', animationDuration: '40s' }}>
          {row2.map((video, idx) => (
            <div key={idx} className="relative w-[200px] md:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg-card flex-shrink-0 bg-black group hover:-translate-y-2 transition-transform duration-300 border-[4px] border-white">
              <video
                src={video.mp4}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-10 shadow-sm">
                <Eye className="w-4 h-4 text-white/90" />
                <span className="text-white/90 text-xs font-medium tracking-wide">{video.views}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative background glows */}
      <div className="absolute left-[20%] top-[40%] w-96 h-96 bg-brand-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute right-[25%] top-[20%] w-[500px] h-[500px] bg-brand-vibrant-teal/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
    </div>
  );
}
