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

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Fetch fresh data from Clerk (bypasses cache)
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const currentPlan = user?.publicMetadata?.plan || "free";
    const interval = user?.publicMetadata?.interval || "month";

    // Monthly credit grant for this plan (yearly = same credits, just billed annually)
    const planCredits = PLAN_CREDITS[currentPlan] ?? 1;
    const planKey = `${currentPlan}:${interval}`; // e.g. "pro:month" or "expert:year"

    // Fetch existing user record
    const { data: existingUser } = await supabase
      .from("user_credits")
      .select("balance, plan, plan_credits")
      .eq("user_id", userId)
      .single();

    let finalBalance = 0;

    if (!existingUser) {
      // ── First-time user ──────────────────────────────────────────
      await supabase.from("user_credits").insert({
        user_id: userId,
        balance: planCredits,
        plan: planKey,
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
      const planChanged = existingUser.plan !== planKey;

      if (planChanged) {
        // ── Plan changed: reset balance to new plan's credits ────────
        // Calculate how many credits were already used in old plan
        const oldPlanCredits = existingUser.plan_credits ?? 0;
        const creditsUsed = Math.max(0, oldPlanCredits - existingUser.balance);

        // New balance = new plan credits minus already-used credits (fair carry-over)
        // Or simply reset fully — your product decision. Here we reset fully:
        finalBalance = planCredits;

        await supabase
          .from("user_credits")
          .update({
            balance: finalBalance,
            plan: planKey,
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
        // ── Same plan: return current balance as-is ──────────────────
        finalBalance = existingUser.balance;
      }
    }

    return NextResponse.json({
      success: true,
      balance: finalBalance,
      planCredits: planCredits, // monthly allowance for this plan
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