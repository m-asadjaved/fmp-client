import React from 'react';

const FAQS = [
  { q: 'Will my rendered videos have watermarks?', a: 'Videos created on our Free plan include a small brand watermark. Upgrading to the Pro Premium or Team plan removes all watermarks completely from your content.' },
  { q: 'How do the AI Caption minutes work?', a: 'Every billing month, your allowance resets. Minutes are calculated based on the length of the audio track you upload for automated translation or subtitle generation.' },
  { q: 'Can I cancel or change my plan later?', a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription straight from your account billing portal at any time with zero cancellation penalties.' }
];

export function LandingFaq() {
  return (
    <section id="faq" className="py-20 bg-white border-t border-gray-100 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm font-bold text-[#00C0D4] uppercase tracking-widest mb-3">FAQ</div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F2347] tracking-tight mb-4">
            Got questions? We have answers
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about plans, features, and billing setups.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#0F2347] mb-3">{faq.q}</h3>
              <p className="text-gray-500 leading-relaxed text-sm md:text-base">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
