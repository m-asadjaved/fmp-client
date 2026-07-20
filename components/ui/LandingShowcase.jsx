import React from 'react';

const SAMPLES = [
  { cat: 'Podcast', title: 'Weekly creator roundup — Episode 42', user: '@alexmakes', views: '14k', color: 'bg-[#0F2347]', span: 'col-span-12 md:col-span-7', thumbType: 0 },
  { cat: 'Product Ad', title: 'Summer collection launch — 15s reel', user: '@mirabrand', views: '31k', color: 'bg-rose-600', span: 'col-span-12 md:col-span-5', thumbType: 1 },
  { cat: 'Tutorial', title: 'How I built my SaaS in 30 days', user: '@jdevs', views: '88k', color: 'bg-[#00C0D4]', span: 'col-span-12 md:col-span-4', thumbType: 2 },
  { cat: 'Short Film', title: 'Cinematic travel vlog — Tokyo 2026', user: '@sanavisuals', views: '52k', color: 'bg-purple-600', span: 'col-span-12 md:col-span-8', thumbType: 3 },
  { cat: 'Course Promo', title: 'Free Figma masterclass — signup teaser', user: '@kdesign', views: '19k', color: 'bg-emerald-600', span: 'col-span-12 md:col-span-6', thumbType: 4 },
  { cat: 'Newsletter', title: 'Turning my email list into a video series', user: '@rwritesnow', views: '7k', color: 'bg-amber-600', span: 'col-span-12 md:col-span-6', thumbType: 5 },
];

function SampleThumb({ type }) {
  const bgColors = ['bg-cyan-50', 'bg-orange-50', 'bg-rose-50', 'bg-sky-50', 'bg-purple-50', 'bg-green-50'];
  const bg = bgColors[type] || 'bg-gray-50';

  if (type === 0) return (
    <div className={`h-48 flex items-center justify-center relative p-4 flex-col gap-1 ${bg}`}>
      <div className="flex items-end gap-1.5 h-[70px]">
        {[30, 50, 40, 65, 45, 55, 35, 60, 40, 50].map((h, i) => (
          <div key={i} style={{ height: h }} className={`w-4 rounded-t-sm ${i % 2 === 0 ? 'bg-cyan-300' : 'bg-[#00C0D4]'}`} />
        ))}
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full w-4/5 mt-2" />
    </div>
  );
  if (type === 1) return (
    <div className={`h-48 flex items-center justify-center relative ${bg}`}>
      <div className="bg-white rounded-xl p-3 w-3/4 border border-transparent shadow-sm">
        <div className="h-2 bg-gray-100 rounded-full mb-1.5 w-4/5" />
        <div className="h-2 bg-gray-100 rounded-full mb-2.5 w-1/2" />
        <div className="h-7 bg-rose-600 rounded-lg flex items-center justify-center">
          <span className="text-[10px] font-[400] text-white">SHOP NOW</span>
        </div>
      </div>
    </div>
  );
  if (type === 2) return (
    <div className={`h-48 flex items-center justify-center relative ${bg}`}>
      <div className="bg-white rounded-xl p-3 w-3/4 border border-transparent shadow-sm">
        <div className="flex gap-2 mb-2">
          <div className="w-7 h-7 bg-[#00C0D4] rounded-md shrink-0" />
          <div className="flex-1">
            <div className="h-1.5 bg-gray-100 rounded-full mb-1" />
            <div className="h-1.5 bg-gray-100 rounded-full w-3/5" />
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full mb-1" />
        <div className="h-1.5 bg-gray-100 rounded-full w-4/5" />
      </div>
    </div>
  );
  if (type === 3) return (
    <div className={`h-48 flex items-center justify-center relative ${bg}`}>
      <div className="bg-white rounded-xl p-3 w-4/5 border border-transparent shadow-sm text-center">
        <div className="w-10 h-10 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center text-lg">✨</div>
        <div className="h-1.5 bg-gray-100 rounded-full mb-1" />
        <div className="h-1.5 bg-gray-100 rounded-full w-2/3 mx-auto" />
      </div>
    </div>
  );
  if (type === 4) return (
    <div className={`h-48 flex items-center justify-center relative ${bg}`}>
      <div className="bg-white rounded-xl p-2.5 w-3/4 border border-transparent shadow-sm">
        <div className="flex gap-1 mb-2">
          <div className="h-10 flex-[2] bg-emerald-600 rounded-md" />
          <div className="h-10 flex-1 bg-gray-100 rounded-md" />
        </div>
        <div className="h-6 border-2 border-transparent bg-cyan-50 text-[#00C0D4] rounded-md flex items-center px-2">
          <span className="text-[9px] font-[400]">WATCH NOW</span>
        </div>
      </div>
    </div>
  );
  return (
    <div className={`h-48 flex items-center justify-center relative ${bg}`}>
      <div className="bg-white rounded-xl p-2.5 w-3/4 border border-transparent shadow-sm">
        <div className="h-1.5 bg-gray-100 rounded-full mb-1.5 w-[90%]" />
        <div className="h-1.5 bg-gray-100 rounded-full mb-2.5 w-[65%]" />
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-6 flex-1 rounded-sm ${i % 2 === 0 ? 'bg-amber-600' : 'bg-amber-100'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <section className="py-20 bg-brand-surface px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-3">Made with twenty2short</div>
          <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4">
            See what creators are making
          </h2>
          <p className="text-[16px] text-brand-on-surface-variant max-w-2xl mx-auto font-[300] leading-[22.4px]">
            From viral social promos to polished full-length podcasts. Explore responsive user productions.
          </p>
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {SAMPLES.map((sample, idx) => (
            <div key={idx} className={`${sample.span} bg-brand-surface rounded-md border border-brand-border-subtle shadow-md-card overflow-hidden flex flex-col group cursor-pointer hover:shadow-lg-card transition-all hover:-translate-y-1`}>
              <SampleThumb type={sample.thumbType} />
              <div className="p-5 flex flex-col flex-1">
                <div className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-2">{sample.cat}</div>
                <h3 className="text-body-regular text-brand-secondary mb-4 line-clamp-2">{sample.title}</h3>
                
                <div className="mt-auto flex items-center gap-2 pt-2 border-t border-brand-border-subtle">
                    <div className={`w-6 h-6 rounded-md ${sample.color} flex items-center justify-center text-white text-micro-label`}>
                      {sample.user[1].toUpperCase()}
                    </div>
                    <span className="text-[11px] text-brand-on-surface-variant font-[300]">
                      {sample.user} · {sample.views} views
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
