'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { usePaddlePrices } from '../../hooks/usePaddlePrices';
import { updateSubscription } from '../../actions/subscription';
import { PricingTier } from '../../constants/pricing-tier';
import { Check, Video, Film, Sparkles, Zap, Unlock } from 'lucide-react';

export function PricingClient({ paddle, country }) {
  const { user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const [frequency, setFrequency] = useState('month');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [activePlan, setActivePlan] = React.useState(null);
  const [paygQuantity, setPaygQuantity] = React.useState(5);
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
                className={`w-full rounded-md py-3.5 px-6 font-bold text-[14px] transition-all duration-200 border-none text-white shadow-md hover:opacity-90 active:scale-[0.98] ${
                  isCurrentPlan ? 'bg-[#16A34A]' : 'bg-gradient-to-r from-[#A855F7] to-[#ff6118]'
                } ${
                  isButtonDisabled && !isCurrentPlan ? 'opacity-50 pointer-events-none' : 'disabled:cursor-default'
                }`}
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Pay As You Go Section */}
      <div className="max-w-4xl mx-auto mt-20 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#A855F7] to-[#ff6118] rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-gradient-to-r from-[#A855F7] to-[#ff6118] p-[1.5px] rounded-3xl shadow-xl">
          <div className="bg-brand-surface bg-dot-pattern rounded-[23px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden h-full">
          {/* Background Glow inside card */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-brand-primary/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="flex-1 relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wide mb-4 border border-brand-primary/20">
              New: Pay As You Go
            </div>
            <h4 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-300 mb-3 tracking-tight drop-shadow-md">Need more credits?</h4>
            <p className="text-white/90 text-lg font-medium">
              Purchase extra processing minutes that never expire. Use them across all current and future tools.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-sm text-white/90 font-medium max-w-sm md:max-w-none">
              <div className="flex items-center gap-3">
                <div className="bg-[#ff6118]/20 p-1.5 rounded-md"><Video className="w-4 h-4 text-[#ff6118]" /></div>
                <span>Process up to <strong className="text-white">{paygQuantity ? paygQuantity * 50 : 0} minutes</strong> of video</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#A855F7]/20 p-1.5 rounded-md"><Film className="w-4 h-4 text-[#A855F7]" /></div>
                <span>Generate roughly <strong className="text-white">{paygQuantity ? Math.round(paygQuantity * 12) : 0} AI Shorts</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-1.5 rounded-md"><Check className="w-4 h-4 text-emerald-400" /></div>
                <span>Credits roll over indefinitely</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-1.5 rounded-md"><Sparkles className="w-4 h-4 text-blue-400" /></div>
                <span>Access all upcoming premium tools</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-1.5 rounded-md"><Zap className="w-4 h-4 text-amber-400" /></div>
                <span>High-priority cloud rendering</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-pink-500/20 p-1.5 rounded-md"><Unlock className="w-4 h-4 text-pink-400" /></div>
                <span>No monthly commitment required</span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-full md:w-[320px] relative z-10">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col items-center">
              <span className="text-sm text-brand-on-surface-variant font-medium mb-4">Choose Amount</span>
              
              <div className="w-full flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setPaygQuantity(Math.max(5, (paygQuantity || 5) - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
                >
                  -
                </button>
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    value={paygQuantity || 5} 
                    onChange={(e) => setPaygQuantity(parseInt(e.target.value) || 5)}
                    className="w-full cursor-pointer accent-[#ff6118]"
                  />
                </div>
                <button 
                  onClick={() => setPaygQuantity(Math.min(100, (paygQuantity || 5) + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
                >
                  +
                </button>
              </div>

              <div className="flex items-center justify-between w-full mb-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col">
                  <input 
                    type="number"
                    min="250"
                    max="5000"
                    step="50"
                    value={(paygQuantity || 0) * 50 || ''}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      setPaygQuantity(isNaN(val) ? '' : Math.min(100, Math.max(1, Math.ceil(val / 50))));
                    }}
                    onBlur={() => {
                      if (!paygQuantity || paygQuantity < 5) setPaygQuantity(5);
                    }}
                    className="w-[100px] bg-transparent text-xl font-bold text-brand-secondary border border-gray-200 rounded-lg px-2 py-0.5 hover:border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  />
                  <span className="text-[10px] text-brand-on-surface-variant uppercase tracking-wider font-bold">Credits</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-2xl font-black text-[#ff6118] gap-1">
                    $
                    <input 
                      type="number"
                      min="5"
                      max="100"
                      step="1"
                      value={paygQuantity || ''}
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        setPaygQuantity(isNaN(val) ? '' : Math.min(100, val));
                      }}
                      onBlur={() => {
                        if (!paygQuantity || paygQuantity < 5) setPaygQuantity(5);
                      }}
                      className="w-[80px] bg-transparent border border-gray-200 rounded-lg px-2 py-0.5 hover:border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-[10px] text-brand-on-surface-variant uppercase tracking-wider font-bold">Total</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!user) {
                    clerk.openSignIn();
                    return;
                  }
                  paddle?.Checkout.open({
                    items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PAYG_SMALL, quantity: Math.max(5, paygQuantity || 5) }],
                    customData: { userId: user.id }
                  });
                }}
                className="w-full cursor-pointer bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white font-bold py-3.5 px-8 rounded-xl shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-[1px] transition-all duration-200 active:scale-[0.98]"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Future Plans Section */}
      <div className="max-w-6xl mx-auto mt-24 text-center">
        <h4 className="text-2xl font-bold text-brand-secondary mb-4 tracking-tight">Upcoming Tools & Standalone Plans</h4>
        <p className="text-brand-on-surface-variant max-w-2xl mx-auto mb-12">
          Your PAYG credits will work across all of these upcoming features. We will also offer dedicated, lower-cost subscriptions for users who only need a specific tool.
        </p>

        <div className="grid md:grid-cols-3 gap-6 opacity-80">
          {[
            { name: "AI Caption Editor", expected: "Q4 2026", price: "$5/mo" },
            { name: "Thumbnail Generator", expected: "Q1 2027", price: "$4/mo" },
            { name: "Viral Hook Writer", expected: "Coming Soon", price: "Free with Credits" }
          ].map((tool, idx) => (
            <div key={idx} className="bg-brand-surfaceBg/50 border border-brand-border-subtle rounded-xl p-6 border-dashed relative">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4 rotate-12">
                <span className="bg-gray-800 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow">Preview</span>
              </div>
              <h5 className="font-bold text-brand-secondary text-lg mb-1">{tool.name}</h5>
              <div className="text-brand-primary font-medium text-sm mb-4">{tool.expected}</div>
              <div className="text-brand-on-surface-variant font-bold text-xl">{tool.price}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
