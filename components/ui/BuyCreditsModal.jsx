'use client';

import React, { useState, useEffect } from 'react';
import { Coins, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { initializePaddle } from "@paddle/paddle-js";

export function BuyCreditsModal({ isOpen, onClose }) {
  const { userId } = useAuth();
  const [paddle, setPaddle] = useState(null);

  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!env || !token) return;

    initializePaddle({ environment: env, token }).then(setPaddle);
  }, []);

  const handleBuy = (priceId) => {
    if (!paddle || !priceId) return;

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { userId } // Important: Links transaction back to the user
    });
    
    // Close modal after opening checkout
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-surface border border-brand-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-brand-primary/10 blur-[50px] -z-10" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-brand-on-surface-variant hover:text-brand-secondary hover:bg-brand-surfaceBg rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4 border border-brand-primary/20">
            <Coins className="w-6 h-6 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-brand-secondary tracking-tight">Need more credits?</h2>
          <p className="text-sm text-brand-on-surface-variant mt-2">
            Purchase extra credits that never expire as long as you're subscribed.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Option 1 */}
          <div className="p-4 border border-brand-border-subtle hover:border-brand-primary/50 rounded-xl transition-colors bg-brand-surfaceBg/50 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="font-medium text-brand-secondary flex items-center gap-2">
                50 Credits <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] rounded-full uppercase font-bold tracking-wider">Popular</span>
              </span>
              <span className="text-xs text-brand-on-surface-variant mt-1">Approx. 50 shorts</span>
            </div>
            <button 
              onClick={() => handleBuy(process.env.NEXT_PUBLIC_PADDLE_PRICE_PAYG_SMALL)}
              className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              $9.99
            </button>
          </div>

          {/* Option 2 */}
          <div className="p-4 border border-brand-border-subtle hover:border-brand-primary/50 rounded-xl transition-colors bg-brand-surfaceBg/50 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="font-medium text-brand-secondary">200 Credits</span>
              <span className="text-xs text-brand-on-surface-variant mt-1">Bulk discount applied</span>
            </div>
            <button 
              onClick={() => handleBuy(process.env.NEXT_PUBLIC_PADDLE_PRICE_PAYG_LARGE)}
              className="px-4 py-2 bg-white text-brand-primary text-sm font-medium rounded-md hover:bg-gray-50 transition-colors border border-brand-primary/20"
            >
              $29.99
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-brand-on-surface-variant/70">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure one-time payment via Paddle</span>
        </div>
      </div>
    </div>
  );
}
