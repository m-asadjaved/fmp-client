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
            className={`cursor-pointer relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold transition-all duration-300 ${
              frequency === 'month'
                ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFrequency('year')}
            className={`cursor-pointer relative w-1/2 rounded-full py-2.5 px-8 text-sm font-semibold transition-all duration-300 ${
              frequency === 'year'
                ? 'bg-white text-slate-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="mt-4 text-sm font-semibold text-[#1fba48]">
          Save 60% with yearly billing
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
        {PricingTier.map((tier) => {
          const priceId = tier.priceId[frequency];
          const priceData = prices[priceId];
          let displayPrice = priceData?.formattedTotal;
          let subtext = "";
          let savingsText = "";

          const monthlyPriceId = tier.priceId['month'];
          const monthlyPriceData = prices[monthlyPriceId];
          const originalMonthlyPrice = monthlyPriceData?.formattedTotal;

          if (frequency === 'year' && priceData && monthlyPriceData) {
            const matchYear = priceData.formattedTotal.match(/[\d.,]+/);
            const matchMonth = monthlyPriceData.formattedTotal.match(/[\d.,]+/);
            
            if (matchYear && matchMonth) {
              const rawYearNum = parseFloat(matchYear[0].replace(/,/g, ''));
              const rawMonthNum = parseFloat(matchMonth[0].replace(/,/g, ''));
              
              const monthlyNum = rawYearNum / 12;
              const formattedMonthly = monthlyNum % 1 === 0 ? monthlyNum.toString() : monthlyNum.toFixed(2);
              displayPrice = priceData.formattedTotal.replace(matchYear[0], formattedMonthly);
              subtext = `per month (${priceData.formattedTotal}/year)`;

              const savings = (rawMonthNum * 12) - rawYearNum;
              if (savings > 0) {
                 const formattedSavings = savings % 1 === 0 ? savings.toString() : savings.toFixed(2);
                 const savingsDisplay = priceData.formattedTotal.replace(matchYear[0], formattedSavings);
                 savingsText = `You save ${savingsDisplay}/year`;
              }
            }
          }

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-3xl p-8 border ${
                tier.featured 
                  ? 'bg-[#ECF3FF] border-[#2563EB]/30 shadow-2xl shadow-blue-900/10 ring-1 ring-[#2563EB]/20' 
                  : 'bg-white border-slate-200 shadow-xl shadow-slate-200/60'
              } transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className={`text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wide uppercase ${
                    tier.id === 'expert' ? 'bg-gradient-to-r from-[#0058bc] to-[#A855F7]' : 
                    tier.id === 'business' ? 'bg-[#16A34A]' : 
                    'bg-slate-800'
                  }`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h4>
                <p className="text-slate-500 text-sm">{tier.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex flex-col gap-1">
                  {frequency === 'year' && (
                    <span className="block text-sm text-[#1fba48] font-semibold mb-2">SAVE 60%</span>
                  )}
                  <div className="flex items-baseline gap-2">
                    {frequency === 'year' && !loading && originalMonthlyPrice && (
                      <span className="line-through text-4xl text-gray-400 font-extrabold">
                        {originalMonthlyPrice}
                      </span>
                    )}
                    <span className={`text-5xl font-extrabold tracking-tight ${frequency === 'year' ? 'text-[#ff6b00]' : 'text-slate-900'}`}>
                      {loading || !displayPrice ? '...' : displayPrice}
                    </span>
                    {frequency === 'month' && !loading && displayPrice && (
                      <span className="text-slate-500 font-medium">/mo</span>
                    )}
                  </div>
                  {frequency === 'year' && !loading && displayPrice && (
                    <>
                      <div className="text-slate-500 font-medium text-sm mt-1">
                        {subtext}
                      </div>
                      {savingsText && (
                        <div className="text-sm text-[#16A34A] font-semibold mt-1">
                          {savingsText}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features[frequency].map((feature, i) => {
                  const bonusMatch = feature.match(/(\d+ Bonus)/);
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#14B8A6]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
                      </div>
                      {bonusMatch ? (
                        <span className="text-slate-600 text-sm">
                          {feature.split(bonusMatch[0])[0]}
                          <span className="text-[#D97706] font-bold">{bonusMatch[0]}</span>
                          {feature.split(bonusMatch[0])[1]}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">{feature}</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={loading || !displayPrice}
                className={`w-full rounded-xl py-3.5 px-6 font-semibold text-sm transition-all duration-200 ${
                  tier.featured
                    ? 'bg-[#0058bc] text-white hover:bg-[#004a9e] shadow-md hover:shadow-lg active:scale-[0.98]'
                    : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 shadow-sm active:scale-[0.98]'
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                Upgrade to {tier.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
