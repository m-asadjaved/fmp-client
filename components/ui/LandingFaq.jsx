import React from 'react';

const FAQS = [
  { q: 'Will my rendered videos have watermarks?', a: 'Videos created on our Free plan include a small brand watermark. Upgrading to the Pro Premium or Team plan removes all watermarks completely from your content.' },
  { q: 'How do the AI Caption minutes work?', a: 'Every billing month, your allowance resets. Minutes are calculated based on the length of the audio track you upload for automated translation or subtitle generation.' },
  { q: 'Can I cancel or change my plan later?', a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription straight from your account billing portal at any time with zero cancellation penalties.' }
];

export function LandingFaq() {
  return (
    <section id="faq" className="py-20 bg-brand-surfaceBg px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-3">FAQ</div>
          <h2 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.03] mb-4">
            Got questions? We have answers
          </h2>
          <p className="text-[16px] text-brand-on-surface-variant font-[300] leading-[22.4px]">
            Everything you need to know about plans, features, and billing setups.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-brand-surface border border-brand-border-subtle rounded-md p-6 shadow-md-card">
              <h3 className="text-body-regular text-brand-secondary mb-3">{faq.q}</h3>
              <p className="text-brand-on-surface-variant leading-[22.4px] text-[14px] md:text-body-light">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
