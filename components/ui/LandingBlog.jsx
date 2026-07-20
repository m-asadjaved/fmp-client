import React from 'react';
import { ArrowRight } from 'lucide-react';

export function LandingBlog() {
  return (
    <section className="py-24 bg-brand-surface px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* Left Column: Newsletter */}
          <div>
            <div className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-3">Community</div>
            <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4 text-balance">
              Unlock the Secrets of Short-Form Clips
            </h2>
            <p className="text-[16px] text-brand-on-surface-variant mb-8 max-w-md font-[300] leading-[22.4px]">
              Subscribe to our newsletter and get the latest tips, case studies, and monetization strategies.
            </p>

            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 border border-brand-border-subtle rounded-md focus:outline-none focus:border-brand-primary transition-colors bg-brand-surface text-brand-on-surface font-[400]"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-brand-primary text-brand-text-on-solid font-[400] text-[14px] rounded-md hover:bg-brand-primaryHover transition-colors shadow-sm-bottom whitespace-nowrap border border-brand-primary"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Right Column: Blog Cards */}
          <div className="grid grid-cols-1 gap-6">
            <a href="#" className="group flex gap-4 items-center bg-brand-surfaceBg rounded-md p-4 border border-brand-border-subtle hover:shadow-md-card transition-shadow">
              <div className="w-24 h-24 bg-brand-surface rounded-md flex-shrink-0 overflow-hidden relative border border-brand-border-subtle">
                <div className="absolute inset-0 bg-brand-primary/10" />
              </div>
              <div>
                <div className="text-[10px] text-brand-primary font-[400] mb-1">STRATEGY</div>
                <h3 className="text-body-regular text-brand-secondary group-hover:text-brand-primary transition-colors line-clamp-2">
                  How to monetize YouTube Shorts in 2026 without 10M views
                </h3>
              </div>
            </a>

            <a href="#" className="group flex gap-4 items-center bg-brand-surfaceBg rounded-md p-4 border border-brand-border-subtle hover:shadow-md-card transition-shadow">
              <div className="w-24 h-24 bg-brand-surface rounded-md flex-shrink-0 overflow-hidden relative border border-brand-border-subtle">
                <div className="absolute inset-0 bg-brand-surfaceBg" />
              </div>
              <div>
                <div className="text-[10px] text-brand-on-surface-variant font-[400] mb-1">TUTORIAL</div>
                <h3 className="text-body-regular text-brand-secondary group-hover:text-brand-on-surface-variant transition-colors line-clamp-2">
                  The perfect AI Hook formula to increase retention by 40%
                </h3>
              </div>
            </a>

            <div className="pt-2 text-right">
              <a href="#" className="inline-flex items-center gap-1 text-label-small text-brand-on-surface-variant hover:text-brand-secondary transition-colors">
                Read all articles <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
