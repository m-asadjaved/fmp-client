import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Monthly credit allowance per plan
const PLAN_CREDITS = {
  free: 1,
  pro: 30,
  expert: 70,
  business: 150,
};

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

// Hardcoded fallback for Paddle Price IDs to guarantee parsing
function getTierFromPriceId(priceId) {
  if (!priceId || priceId === "free" || priceId === "free:month") return { name: "free", interval: "month" };
  
  const cleanId = priceId.trim();
  
  // Exact string matching for bulletproof reliability
  if (cleanId === "pri_01kxtpqmm034m2ymjkah17vmn6") return { name: "starter", interval: "month" };
  if (cleanId === "pri_01kxtpqmz7wc24fxb7r2ecfxd3") return { name: "starter", interval: "year" };
  if (cleanId === "pri_01kxtpqnqnt90va0vsgv2zbnvs") return { name: "pro", interval: "month" };
  if (cleanId === "pri_01kxtpqp2zdvv6xczyv0mcjdyx") return { name: "pro", interval: "year" };
  if (cleanId === "pri_01kxtpqpsyg69pjp8d9yrxhybg") return { name: "advanced", interval: "month" };
  if (cleanId === "pri_01kxtpqq4jeq9by7t5r9r1dajt") return { name: "advanced", interval: "year" };
  
  // Legacy plan format like "pro:month"
  if (cleanId.includes(":")) {
    const [tier, interval] = cleanId.split(":");
    return { name: tier, interval };
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
      const mapped = getTierFromPriceId(existingUser.plan);
      currentPlan = mapped.name;
      interval = mapped.interval;
    } else if (clerkMeta?.plan) {
      // Legacy Clerk Metadata
      currentPlan = clerkMeta.plan;
      interval = clerkMeta.interval || "month";
      rawPlanKey = `${currentPlan}:${interval}`;
    } else if (existingUser?.plan) {
      // Legacy Supabase Format ("pro:month")
      const [storedPlan, storedInterval] = existingUser.plan.split(":");
      currentPlan = storedPlan || "free";
      interval = storedInterval || "month";
      rawPlanKey = existingUser.plan;
    } else {
      currentPlan = "free";
      interval = "month";
      rawPlanKey = "free:month";
    }

    // Monthly credit grant for this plan
    const planCredits = PLAN_CREDITS[currentPlan] ?? 1;

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