"use server";

import { getPaddleInstance } from "../utils/paddle/get-paddle-instance";
import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

export async function updateSubscription(newPriceId) {
  // 1. Authenticate using Clerk
  const user = await currentUser();
  if (!user || !user.primaryEmailAddress?.emailAddress) {
    return { error: "Not authenticated" };
  }

  const email = user.primaryEmailAddress.emailAddress;
  const supabase = getSupabaseClient();

  // 2. Look up the Paddle customer_id via the email bridge
  const { data: customerRow } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("email", email)
    .single();

  if (!customerRow?.customer_id) {
    return { error: "No active subscription" };
  }

  // 3. Look up the active subscription_id for this customer
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("subscription_id, status")
    .eq("customer_id", customerRow.customer_id)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const activeSub = subRows?.[0];

  if (!activeSub?.subscription_id) {
    return { error: "No active subscription" };
  }

  const subscriptionId = activeSub.subscription_id;

  try {
    // 4. Apply the plan change using Paddle SDK
    const paddle = getPaddleInstance();
    const subscription = await paddle.subscriptions.update(subscriptionId, {
      items: [{ priceId: newPriceId, quantity: 1 }],
      prorationBillingMode: "prorated_immediately",
    });

    // 5. Refresh cached UI
    revalidatePath("/dashboard");
    revalidatePath("/pricing");

    return {
      success: true,
      priceId: subscription.items[0]?.price?.id ?? null,
      status: subscription.status,
    };
  } catch (error) {
    console.error("Subscription update error:", error);
    // Paddle errors often have helpful messages in error.message or error.response.data
    const errorMessage = error?.response?.data?.error?.detail || error.message || "Failed to update subscription";
    return { error: errorMessage };
  }
}
