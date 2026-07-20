'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { usePaddlePrices } from '../../hooks/usePaddlePrices';
import { updateSubscription } from '../../actions/subscription';
import { PricingTier } from '../../constants/pricing-tier';
import { Check } from 'lucide-react';

export function PricingClient({ paddle, country }) {
  const { user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const [frequency, setFrequency] = useState('month');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [activePlan, setActivePlan] = React.useState(null);
  const { prices, loading } = usePaddlePrices(paddle, country);

  React.useEffect(() => {
    if (!user) {
      setActivePlan("free");
      return;
    }
    fetch('/api/credits', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.currentPlan) {
          setActivePlan(data.currentPlan);
        } else {
          setActivePlan("free");
        }
      })
      .catch((err) => {
        console.error(err);
        setActivePlan("free");
      });
  }, [user]);

  const handleSubscribe = async (tier) => {
    if (!user) {
      clerk.openSignIn();
      return;
    }

    if (isUpgrading) return;
    setIsUpgrading(true);

    const priceId = tier.priceId[frequency];

    try {
      // 1. Attempt to upgrade existing subscription
      const updateResult = await updateSubscription(priceId);

      // 2. If no active subscription, fall back to opening checkout
      if (updateResult?.error === "No active subscription") {
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

        paddle?.Checkout.open(checkoutConfig);
      } else if (updateResult?.error) {
        // Handle explicit upgrade failures
        alert("Upgrade failed: " + updateResult.error);
      } else if (updateResult?.success) {
        // Upgrade succeeded
        alert("Your subscription has been successfully updated!");
        router.push('/dashboard');
      }
    } catch (err) {
      console.error("Subscription process failed:", err);
      alert("An error occurred: " + err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">

        <h3 className="text-[26px] md:text-hero-heading md:text-[44px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] to-[#ff6118] py-6 mb-2 tracking-[-0.26px] leading-[1.03]">
          Pricing
        </h3>
        <p className="text-[16px] text-brand-on-surface-variant font-[300] leading-[22.4px] mb-8">
          Choose the perfect plan for your video editing needs. No hidden fees.
        </p>
        
        {/* Toggle */}
        <div className="relative inline-flex bg-gray-100 rounded-full p-1 shadow-inner border border-gray-200 w-64">
          <div 
             className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow border border-gray-200 transition-transform duration-300 ease-out ${frequency === 'year' ? 'translate-x-[100%]' : 'translate-x-0'}`} 
          />
          <button
            onClick={() => setFrequency('month')}
            className={`cursor-pointer relative z-10 w-1/2 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 ${
              frequency === 'month'
                ? 'text-brand-secondary'
                : 'text-brand-on-surface-variant hover:text-brand-secondary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFrequency('year')}
            className={`cursor-pointer relative z-10 w-1/2 rounded-full py-2.5 text-sm font-bold transition-colors duration-300 ${
              frequency === 'year'
                ? 'text-brand-secondary'
                : 'text-brand-on-surface-variant hover:text-brand-secondary'
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="mt-6 flex justify-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#e8f5ec] text-[#16A34A] text-sm font-bold shadow-sm border border-[#16A34A]/20">
            ✨ Save 60% with yearly billing
          </span>
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

          const isCurrentPlan = activePlan && (activePlan === tier.id || Object.values(tier.priceId).includes(activePlan));
          const hasAnyPlan = activePlan && activePlan !== 'free' && activePlan !== 'free:month';
          const isButtonDisabled = loading || !displayPrice || hasAnyPlan;

          let buttonText = `Upgrade to ${tier.name}`;
          if (isCurrentPlan) {
            buttonText = "Current Plan";
          } else if (hasAnyPlan) {
            buttonText = "Available after current plan ends";
          }

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl p-8 shadow-xl bg-white ${
                tier.id === 'expert'
                  ? 'border-2 border-[#A855F7] shadow-[0_10px_40px_rgba(168,85,247,0.15)] ring-1 ring-[#A855F7]' 
                  : 'border-2 border-transparent'
              } transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}
            >
              {tier.badge && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 w-max">
                  <span className={`text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg border-[2px] border-white uppercase tracking-wider ${
                    tier.id === 'expert' ? 'bg-[#A855F7]' : 
                    tier.id === 'business' ? 'bg-[#16A34A]' : 
                    'bg-[#ff6118]'
                  }`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-[28px] font-bold text-brand-secondary mb-2 tracking-tight">{tier.name}</h4>
                <p className="text-brand-on-surface-variant text-[14px] font-[300] leading-[22.4px]">{tier.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex flex-col gap-1">
                  {frequency === 'year' && (
                    <span className="inline-block px-2 py-0.5 rounded bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-bold uppercase mb-0.5 w-max">
                      SAVE 60%
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    {frequency === 'year' && !loading && originalMonthlyPrice && (
                      <span className="line-through text-4xl text-brand-border-subtle font-bold">
                        {originalMonthlyPrice}
                      </span>
                    )}
                    <span className="text-[36px] md:text-[44px] font-black tracking-[-0.26px] text-[#ff6118]">
                      {loading || !displayPrice ? '...' : displayPrice}
                    </span>
                    {frequency === 'month' && !loading && displayPrice && (
                      <span className="text-brand-on-surface-variant font-bold">/mo</span>
                    )}
                  </div>
                  {frequency === 'year' && !loading && displayPrice && (
                    <>
                      <div className="text-brand-on-surface-variant font-[300] text-[14px] mt-1">
                        {subtext}
                      </div>
                      {savingsText && (
                        <div className="text-[14px] text-[#16A34A] font-[400] mt-1">
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
                      <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#16A34A]/20">
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={3} />
                      </div>
                      {bonusMatch ? (
                        <span className="text-brand-secondary text-[14px] font-[300]">
                          {feature.split(bonusMatch[0])[0]}
                          <span className="text-brand-primary font-[400]">{bonusMatch[0]}</span>
                          {feature.split(bonusMatch[0])[1]}
                        </span>
                      ) : (
                        <span className="text-brand-secondary text-[14px] font-[300]">{feature}</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={isButtonDisabled}
                className={`w-full rounded-md py-3.5 px-6 font-bold text-[14px] transition-all duration-200 border-none bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white shadow-md hover:opacity-90 active:scale-[0.98] ${
                  isButtonDisabled && !isCurrentPlan ? 'opacity-50 pointer-events-none' : 'disabled:cursor-default'
                }`}
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
