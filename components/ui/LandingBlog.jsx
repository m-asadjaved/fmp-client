import React from 'react';
import { ArrowRight } from 'lucide-react';

export function LandingBlog() {
  return (
    <section className="py-24 bg-white border-t border-gray-100 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* Left Column: Newsletter */}
          <div>
            <div className="text-sm font-bold text-[#00C0D4] uppercase tracking-widest mb-3">Community</div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F2347] tracking-tight mb-4 text-balance">
              Unlock the Secrets of Short-Form Clips
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md">
              Subscribe to our newsletter and get the latest tips, case studies, and monetization strategies.
            </p>

            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#00C0D4] transition-colors"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#0F2347] text-white font-bold rounded-xl hover:bg-[#0C1C3A] transition-colors shadow-md whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Right Column: Blog Cards */}
          <div className="grid grid-cols-1 gap-6">
            <a href="#" className="group flex gap-4 items-center bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-[#00C0D4]/20" />
              </div>
              <div>
                <div className="text-xs text-[#00C0D4] font-bold mb-1">STRATEGY</div>
                <h3 className="text-lg font-bold text-[#0F2347] group-hover:text-[#00C0D4] transition-colors line-clamp-2">
                  How to monetize YouTube Shorts in 2026 without 10M views
                </h3>
              </div>
            </a>

            <a href="#" className="group flex gap-4 items-center bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-gray-200/50" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold mb-1">TUTORIAL</div>
                <h3 className="text-lg font-bold text-[#0F2347] group-hover:text-gray-500 transition-colors line-clamp-2">
                  The perfect AI Hook formula to increase retention by 40%
                </h3>
              </div>
            </a>

            <div className="pt-2 text-right">
              <a href="#" className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                Read all articles <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
