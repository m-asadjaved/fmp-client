'use client';

import React from 'react';
import { Coins, Clock, ArrowRight, Scissors } from 'lucide-react';

export function LandingCreditExplanation() {
  return (
    <section className="py-4 px-4 bg-brand-surface relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-shadow duration-300 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          {/* Background Glows */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#ff6118]/5 to-[#A855F7]/5 rounded-full blur-[30px] pointer-events-none" />
          
          {/* Left: Text */}
          <div className="text-center md:text-left relative z-10 flex-1">
            <h2 className="text-[16px] md:text-[18px] font-bold text-brand-secondary tracking-tight leading-tight mb-1">
              Simple credit pricing.
            </h2>
            <p className="text-[12px] md:text-[13px] text-brand-on-surface-variant font-[300]">
              No fractions. Example: A 35-min video costs 2 credits.
            </p>
          </div>

          {/* Right: Equation */}
          <div className="flex flex-row items-center justify-center gap-2 relative z-10 shrink-0 flex-wrap sm:flex-nowrap">
            {/* 1 Credit */}
            <div className="flex flex-row items-center gap-2 bg-brand-surfaceBg px-3 py-2 rounded-lg shadow-sm">
              <Coins className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-[13px] font-bold text-brand-secondary leading-none">1 Credit</span>
            </div>

            <ArrowRight className="w-4 h-4 text-brand-border-subtle hidden sm:block" strokeWidth={3} />
            <div className="sm:hidden text-brand-border-subtle">+</div>

            {/* 20 Mins */}
            <div className="flex flex-row items-center gap-2 bg-brand-surfaceBg px-3 py-2 rounded-lg shadow-sm group">
              <Clock className="w-4 h-4 text-[#A855F7]" />
              <span className="text-[13px] font-bold text-brand-secondary leading-none">20 Mins</span>
            </div>

            <ArrowRight className="w-4 h-4 text-brand-border-subtle hidden sm:block" strokeWidth={3} />
            <div className="sm:hidden text-brand-border-subtle">=</div>

            {/* All Clips */}
            <div className="flex flex-row items-center gap-2 bg-brand-surfaceBg px-3 py-2 rounded-lg shadow-sm relative">
              <Scissors className="w-4 h-4 text-[#ff6118]" />
              <span className="text-[13px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] to-[#ff6118] leading-none">All Clips</span>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
