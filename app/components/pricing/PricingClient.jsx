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
        <h2 className="text-micro-label text-brand-primary uppercase tracking-[0.1px] mb-3">Pricing</h2>
        <h3 className="text-[26px] md:text-hero-heading md:text-[44px] font-[300] text-brand-secondary mb-6 tracking-[-0.26px] leading-[1.03]">
          Simple, transparent pricing
        </h3>
        <p className="text-[16px] text-brand-on-surface-variant font-[300] leading-[22.4px] mb-8">
          Choose the perfect plan for your video editing needs. No hidden fees.
        </p>
        
        {/* Toggle */}
        <div className="relative inline-flex bg-brand-surfaceBg rounded-md p-1 border border-brand-border-subtle shadow-sm-bottom">
          <button
            onClick={() => setFrequency('month')}
            className={`cursor-pointer relative w-1/2 rounded-md py-2.5 px-8 text-label-small transition-all duration-300 ${
              frequency === 'month'
                ? 'bg-brand-surface text-brand-secondary shadow-sm-bottom'
                : 'text-brand-on-surface-variant hover:text-brand-secondary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFrequency('year')}
            className={`cursor-pointer relative w-1/2 rounded-md py-2.5 px-8 text-label-small transition-all duration-300 ${
              frequency === 'year'
                ? 'bg-brand-surface text-brand-secondary shadow-sm-bottom'
                : 'text-brand-on-surface-variant hover:text-brand-secondary'
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="mt-4 text-[11px] font-[400] text-brand-primary">
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

          const isCurrentPlan = activePlan && (activePlan === tier.id || Object.values(tier.priceId).includes(activePlan));
          const hasAnyPlan = activePlan && activePlan !== 'free' && activePlan !== 'free:month';
          const isButtonDisabled = loading || !displayPrice || hasAnyPlan;

          let buttonText = `Upgrade to ${tier.name}`;
          if (isCurrentPlan) {
            buttonText = "Current Plan";
          }

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-xl p-8 border ${
                tier.featured 
                  ? 'bg-brand-surface border-brand-primary/30 shadow-lg-card ring-1 ring-brand-primary/20' 
                  : 'bg-brand-surface border-brand-border-subtle shadow-md-card'
              } transition-all duration-300 hover:-translate-y-1 hover:shadow-lg-card`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className={`text-white text-micro-label px-4 py-1.5 rounded-full shadow-sm-bottom tracking-[0.1px] uppercase ${
                    tier.id === 'expert' ? 'bg-gradient-to-r from-brand-primary to-[#A855F7]' : 
                    tier.id === 'business' ? 'bg-[#16A34A]' : 
                    'bg-brand-secondary'
                  }`}>
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-section-heading-md font-[300] text-brand-secondary mb-2 tracking-[-0.22px]">{tier.name}</h4>
                <p className="text-brand-on-surface-variant text-[14px] font-[300] leading-[22.4px]">{tier.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex flex-col gap-1">
                  {frequency === 'year' && (
                    <span className="block text-[11px] text-brand-primary font-[400] mb-2 uppercase">SAVE 60%</span>
                  )}
                  <div className="flex items-baseline gap-2">
                    {frequency === 'year' && !loading && originalMonthlyPrice && (
                      <span className="line-through text-4xl text-brand-border-subtle font-light">
                        {originalMonthlyPrice}
                      </span>
                    )}
                    <span className="text-hero-heading md:text-[44px] font-light tracking-[-0.26px] text-brand-secondary">
                      {loading || !displayPrice ? '...' : displayPrice}
                    </span>
                    {frequency === 'month' && !loading && displayPrice && (
                      <span className="text-brand-on-surface-variant font-[300]">/mo</span>
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
                      <div className="stripe-btn-primary">
                        <Check className="w-3.5 h-3.5 text-brand-primary" />
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
                className={`w-full rounded-md py-3.5 px-6 font-[400] text-[14px] transition-all duration-200 border ${
                  isCurrentPlan 
                    ? 'bg-brand-surfaceBg text-brand-secondary border-brand-border-subtle'
                    : tier.featured
                      ? 'bg-brand-primary text-brand-text-on-solid border-brand-primary hover:bg-brand-primaryHover shadow-sm-bottom active:scale-[0.98]'
                      : 'bg-brand-surface text-brand-secondary hover:bg-brand-surfaceBg border-brand-border-subtle hover:border-brand-on-surface-variant shadow-sm-bottom active:scale-[0.98]'
                } disabled:opacity-50 disabled:pointer-events-none`}
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
