import React from 'react';
import { Scissors, Maximize, Puzzle, Cloud } from 'lucide-react';

const FEATURES = [
  { icon: <Scissors className="w-6 h-6 text-[#00C0D4]" />, title: 'AI Auto-Captions', desc: 'Transcribe audio in 30+ languages instantly with flawless burn-in stylized text overlays.' },
  { icon: <Maximize className="w-6 h-6 text-[#00C0D4]" />, title: 'Smart canvas resize', desc: 'Auto-reframe any video composition into 9:16 Shorts, 1:1 square, or 16:9 widescreen formats.' },
  { icon: <Puzzle className="w-6 h-6 text-[#00C0D4]" />, title: 'Creator plugin store', desc: 'Supercharge edits with background removers, realistic AI voiceovers, and sound effects libraries.' },
  { icon: <Cloud className="w-6 h-6 text-[#00C0D4]" />, title: 'Cloud project library', desc: 'Save project files securely online. Edit, collaborate, and cut from any machine, anywhere.' },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 bg-gray-50 border-t border-gray-100 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-sm font-bold text-[#00C0D4] uppercase tracking-widest mb-3">Features</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F2347] tracking-tight mb-4">
            Everything a creator needs
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful workflow components that stay out of your way. Let AI handle the tedious tasks while you focus on creativity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-5">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center shrink-0 border border-cyan-100">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F2347] mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
