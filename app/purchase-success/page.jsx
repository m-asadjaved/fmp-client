"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { CheckCircle2, Coins, ArrowRight, Loader2 } from "lucide-react";

export default function PurchaseSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [currentPlan, setCurrentPlan] = useState('');
  
  // Motion values for managing the numerical ticking animation
  const count = useMotionValue(0);
  const roundedRounded = useTransform(count, (latest) => Math.round(latest));
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    // Listen to changes on the motion count to update standard state
    const unsubscribe = roundedRounded.on("change", (latest) => {
      setDisplayCount(latest);
    });

    async function fetchUpdatedBalance() {
      try {
        const res = await fetch("/api/credits");
        const data = await res.json();

        if (data.success) {
          setCreditsAdded(data.addedCredits);
          setCurrentPlan(data.currentPlan);
          setLoading(false);

          // Animates numbers from 0 up to the target balance over 2 seconds
          animate(count, data.balance, {
            duration: 2,
            ease: "easeOut",
          });
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
        setLoading(false);
      }
    }

    fetchUpdatedBalance();
    return () => unsubscribe();
  }, [count, roundedRounded]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-zinc-400 animate-pulse">Updating your credit profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      {/* Dynamic Background Aurora Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl relative overflow-hidden"
      >
        {/* Animated Pop Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </motion.div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">{currentPlan === 'free' ? 'Signed Up' : 'Purchase'} Successful!</h1>
        <p className="text-zinc-400 text-sm mb-8">Your account sync is complete. Your new balance is live below.</p>

        {/* Balance Counter Container Box */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8 relative">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Total Available Balance
          </span>
          
          <div className="flex items-center justify-center gap-3">
            <Coins className="w-6 h-6 text-amber-400 animate-pulse" />
            <span className="text-4xl font-extrabold tracking-tight text-zinc-50">
              {displayCount}
            </span>
          </div>

          {/* Incoming Credit Indicator Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium px-2.5 py-0.5 rounded-full"
          >
            +{creditsAdded} credits added
          </motion.div>
        </div>

        {/* Call to Action Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 group text-sm"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </motion.div>
    </div>
  );
}