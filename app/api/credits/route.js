import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

import { PLAN_LIMITS } from "../../config/plan-limits";
import { getPaddleInstance } from "../../utils/paddle/get-paddle-instance";

/**
 * Attempt to fetch Clerk user metadata with a timeout.
 * Returns null on any network/API failure so callers can fall back gracefully.
 */
async function getClerkUserMetadata(userId) {
  const TIMEOUT_MS = 5000;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const client = await clerkClient();
    const userPromise = client.users.getUser(userId);

    // Race the Clerk request against a timeout
    const user = await Promise.race([
      userPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Clerk API timeout")),
          TIMEOUT_MS
        )
      ),
    ]);

    clearTimeout(timeoutId);
    return {
      plan: user?.publicMetadata?.plan || null,
      interval: user?.publicMetadata?.interval || null,
    };
  } catch (err) {
    console.warn(
      "Clerk API unavailable, falling back to Supabase plan data:",
      err?.message || err
    );
    return null;
  }
}

const PRICE_ID_MAP = {
  // Legacy
  "pri_01kxtpqmm034m2ymjkah17vmn6": { name: "pro", interval: "month" },
  "pri_01kxtpqmz7wc24fxb7r2ecfxd3": { name: "pro", interval: "year" },
  "pri_01kxtpqnqnt90va0vsgv2zbnvs": { name: "expert", interval: "month" },
  "pri_01kxtpqp2zdvv6xczyv0mcjdyx": { name: "expert", interval: "year" },
  "pri_01kxtpqpsyg69pjp8d9yrxhybg": { name: "business", interval: "month" },
  "pri_01kxtpqq4jeq9by7t5r9r1dajt": { name: "business", interval: "year" },

  // Pre-trial-removal
  "pri_01kxw2nfqc83xasghh0vsakfw6": { name: "pro", interval: "month" },
  "pri_01kxw2ng1w60e6ewdyw2j5pwd0": { name: "pro", interval: "year" },
  "pri_01kxw2ngpeer0yphs1r68v3tp6": { name: "expert", interval: "month" },
  "pri_01kxw2nhha05b51crn6t149b92": { name: "expert", interval: "year" },
  "pri_01kxw2njj30p865v3bg6qja7bx": { name: "business", interval: "month" },
  "pri_01kxw2njtv466g5k4cny9xnv9w": { name: "business", interval: "year" },

  // No-trial
  "pri_01kxweecrqfhaeer2sdsff513c": { name: "pro", interval: "month" },
  "pri_01kxweed5jbcfxq3v3xe9za6jg": { name: "pro", interval: "year" },
  "pri_01kxweedyshw4g01hwstm1jcbf": { name: "expert", interval: "month" },
  "pri_01kxweeebaa7p82bhwp4em78b1": { name: "expert", interval: "year" },
  "pri_01kxweef571e6rvr2j13m5wgzj": { name: "business", interval: "month" },
  "pri_01kxweeg0sqj29jachjw5yjwr8": { name: "business", interval: "year" },

  // Max-qty-1
  "pri_01kxwfd1290tvqfsbqrfkb6q0a": { name: "pro", interval: "month" },
  "pri_01kxwfd1f5pdwng1rpdzncthrj": { name: "pro", interval: "year" },
  "pri_01kxwfd28sxm3aet61g1t3t4w5": { name: "expert", interval: "month" },
  "pri_01kxwfd340pyb63f0t6cajjv5e": { name: "expert", interval: "year" },
  "pri_01kxwfd3y60yk8eykqtw83rg0s": { name: "business", interval: "month" },
  "pri_01kxwfd4akckzngrdrb727c132": { name: "business", interval: "year" }
};

async function getTierFromPriceId(priceId) {
  if (!priceId || priceId === "free" || priceId === "free:month") return { name: "free", interval: "month" };
  const cleanId = priceId.trim();
  
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH) return { name: "pro", interval: "month" };
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR) return { name: "pro", interval: "year" };
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_MONTH) return { name: "expert", interval: "month" };
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_YEAR) return { name: "expert", interval: "year" };
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_MONTH) return { name: "business", interval: "month" };
  if (cleanId === process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_YEAR) return { name: "business", interval: "year" };
  
  if (PRICE_ID_MAP[cleanId]) return PRICE_ID_MAP[cleanId];
  
  if (cleanId.includes(":")) {
    const [tier, interval] = cleanId.split(":");
    return { name: tier, interval };
  }
  
  if (cleanId.startsWith("pri_")) {
    try {
      const paddle = getPaddleInstance();
      const price = await paddle.prices.get(cleanId, { include: ['product'] });
      if (price) {
        const desc = price.product?.description || price.description || price.product?.name || cleanId;
        return { name: desc, interval: price.billingCycle?.interval || "month" };
      }
    } catch(err) {
      console.error("Failed to fetch price from paddle", err);
    }
  }

  return { name: cleanId, interval: "month" };
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Fetch existing user record from Supabase (always needed)
    const { data: existingUser } = await supabase
      .from("user_credits")
      .select("balance, plan, plan_credits")
      .eq("user_id", userId)
      .single();

    // Try Clerk first; fall back to Supabase's stored plan if Clerk is down
    const clerkMeta = await getClerkUserMetadata(userId);

    let currentPlan;
    let interval;
    let rawPlanKey;

    if (existingUser?.plan && existingUser.plan.startsWith("pri_")) {
      // Paddle Price ID stored directly in database
      rawPlanKey = existingUser.plan;
      const mapped = await getTierFromPriceId(existingUser.plan);
      currentPlan = mapped.name;
      interval = mapped.interval;
    } else if (clerkMeta?.plan) {
      // Legacy Clerk Metadata
      let mappedPlan = clerkMeta.plan;
      if (mappedPlan === "starter") mappedPlan = "pro";
      else if (mappedPlan === "pro") mappedPlan = "expert";
      else if (mappedPlan === "advanced") mappedPlan = "business";

      currentPlan = mappedPlan;
      interval = clerkMeta.interval || "month";
      rawPlanKey = `${currentPlan}:${interval}`;
    } else if (existingUser?.plan) {
      // Legacy Supabase Format ("pro:month")
      const [storedPlan, storedInterval] = existingUser.plan.split(":");
      let mappedPlan = storedPlan || "free";
      if (mappedPlan === "starter") mappedPlan = "pro";
      else if (mappedPlan === "pro") mappedPlan = "expert";
      else if (mappedPlan === "advanced") mappedPlan = "business";

      currentPlan = mappedPlan;
      interval = storedInterval || "month";
      rawPlanKey = existingUser.plan;
    } else {
      currentPlan = "free";
      interval = "month";
      rawPlanKey = "free:month";
    }

    // Monthly credit grant for this plan
    const planCredits = PLAN_LIMITS[currentPlan]?.creditsPerMonth ?? 1;

    let finalBalance = 0;

    if (!existingUser) {
      // ── First-time user ──────────────────────────────────────────
      await supabase.from("user_credits").insert({
        user_id: userId,
        balance: planCredits,
        plan: rawPlanKey,
        plan_credits: planCredits,
      });

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: planCredits,
        description:
          currentPlan === "free"
            ? "Sign-up bonus credits"
            : `Purchased ${currentPlan} Plan (${interval})`,
      });

      finalBalance = planCredits;
    } else {
      const planChanged = existingUser.plan !== rawPlanKey;

      if (planChanged && clerkMeta) {
        // ── Plan changed (only update if Clerk confirmed the new plan) ────
        finalBalance = planCredits;

        await supabase
          .from("user_credits")
          .update({
            balance: finalBalance,
            plan: rawPlanKey,
            plan_credits: planCredits,
          })
          .eq("user_id", userId);

        const planLabel =
          currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: planCredits,
          description: `Switched to ${planLabel} Plan (${interval})`,
        });
      } else {
        // ── Same plan (or Clerk down — return stored balance) ────────────
        finalBalance = existingUser.balance;
      }
    }

    return NextResponse.json({
      success: true,
      balance: finalBalance,
      planCredits: planCredits,
      currentPlan: currentPlan,
      interval: interval,
    });
  } catch (error) {
    console.error("Credit fetching error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}