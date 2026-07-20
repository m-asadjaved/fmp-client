'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: 'Will my rendered videos have watermarks?', a: 'Videos created on our Free plan include a small brand watermark. Upgrading to the Pro Premium or Team plan removes all watermarks completely from your content.' },
  { q: 'How do the AI Caption minutes work?', a: 'Every billing month, your allowance resets. Minutes are calculated based on the length of the audio track you upload for automated translation or subtitle generation.' },
  { q: 'Can I cancel or change my plan later?', a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription straight from your account billing portal at any time with zero cancellation penalties.' }
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-brand-surfaceBg px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[20px] font-bold text-brand-primary uppercase tracking-wider mb-3">FAQ</div>
          <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4">
            Got questions? We have answers
          </h2>
          <p className="text-[16px] text-brand-on-surface-variant font-[300] leading-[22.4px]">
            Everything you need to know about plans, features, and billing setups.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="bg-white relative z-10 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-none transition-all duration-200">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <h3 className={`text-[18px] font-bold ${isOpen ? 'text-[#ff6118]' : 'text-brand-secondary'}`}>{faq.q}</h3>
                  <ChevronDown className={`w-5 h-5 text-brand-secondary transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#ff6118]' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                  <div className="overflow-hidden">
                    <p className="text-brand-on-surface-variant leading-[22.4px] text-[16px]">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
