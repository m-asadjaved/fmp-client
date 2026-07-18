'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePaddlePrices } from '../../hooks/usePaddlePrices';
import { PricingTier } from '../../constants/pricing-tier';
import { Check } from 'lucide-react';

export function PricingClient({ paddle, country }) {
  const { user } = useUser();
  const [frequency, setFrequency] = useState('month');
  const { prices, loading } = usePaddlePrices(paddle, country);

  const handleSubscribe = (tier) => {
    const priceId = tier.priceId[frequency];
    const checkoutConfig = {
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        successUrl: typeof window !== 'undefined' ? `${window.location.origin}/welcome` : '/welcome'
      }
    };

    if (user?.primaryEmailAddress?.emailAddress) {
      checkoutConfig.customer = { email: user.primaryEmailAddress.emailAddress };
      checkoutConfig.customData = { userId: user.id };
    }

    try {
      paddle?.Checkout.open(checkoutConfig);
    } catch (err) {
      console.error("Failed to open Paddle checkout:", err);
      alert("Checkout failed to open: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-sm font-semibold text-[#0058bc] uppercase tracking-wider mb-3">Pricing</h2>
        <h3 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
          Simple, transparent pricing
        </h3>
        <p className="text-lg text-slate-600 mb-8">
          Choose the perfect plan for your video editing needs. No hidden fees.
        </p>
        
        {/* Toggle */}
        <div className="relative inline-flex bg-slate-100 rounded-full p-1 border border-slate-200/60 shadow-sm">
          <button
            onClick={() => setFrequency('month')}
            className={`relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold transition-all duration-300 ${
              frequency === 'month'
                ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFrequency('year')}
            className={`relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold transition-all duration-300 ${
              frequency === 'year'
                ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
        {PricingTier.map((tier) => {
          const priceId = tier.priceId[frequency];
          const formattedTotal = prices[priceId];

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-3xl p-8 bg-white border ${
                tier.featured 
                  ? 'border-[#0058bc] shadow-xl shadow-[#0058bc]/10 ring-1 ring-[#0058bc]/20' 
                  : 'border-slate-200/60 shadow-lg shadow-slate-200/50'
              } transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              {tier.featured && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-[#0058bc] to-[#A855F7] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wide uppercase">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h4>
                <p className="text-slate-500 text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                    {loading || !formattedTotal ? '...' : formattedTotal}
                  </span>
                  <span className="text-slate-500 font-medium">/{frequency === 'month' ? 'mo' : 'yr'}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#14B8A6]/10 flex items-center justify-center mt-0.5">
                      <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
                    </div>
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={loading || !formattedTotal}
                className={`w-full rounded-xl py-3.5 px-6 font-semibold text-sm transition-all duration-200 ${
                  tier.featured
                    ? 'bg-[#0058bc] text-white hover:bg-[#004a9e] shadow-md hover:shadow-lg active:scale-[0.98]'
                    : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 shadow-sm active:scale-[0.98]'
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                Subscribe
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
