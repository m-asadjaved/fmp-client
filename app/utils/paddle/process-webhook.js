import { createClient } from "@supabase/supabase-js";
import { EventName } from "@paddle/paddle-node-sdk";
import { PLAN_LIMITS } from "../../config/plan-limits";

function getCreditsFromPriceId(priceId) {
  if (!priceId || priceId === "free" || priceId === "free:month") return PLAN_LIMITS.free.creditsPerMonth;
  
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH || priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR) return PLAN_LIMITS.pro.creditsPerMonth;
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_MONTH || priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_YEAR) return PLAN_LIMITS.expert.creditsPerMonth;
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_MONTH || priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_YEAR) return PLAN_LIMITS.business.creditsPerMonth;
  
  if (priceId.includes("pro")) return PLAN_LIMITS.pro.creditsPerMonth;
  if (priceId.includes("expert")) return PLAN_LIMITS.expert.creditsPerMonth;
  if (priceId.includes("business")) return PLAN_LIMITS.business.creditsPerMonth;

  return PLAN_LIMITS.free.creditsPerMonth;
}

export async function processEvent(event) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return upsertSubscription(event);
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      return upsertCustomer(event);
    case EventName.TransactionCompleted:
      // Typically used to grant one-time access or log purchases.
      return handleTransactionCompleted(event);
    default:
      return;
  }
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

async function upsertSubscription(event) {
  const supabase = getSupabaseClient();
  const sub = event.data;

  // Extract customData userId just in case we need to link it to user_credits
  let userId = sub.customData?.userId;

  // Paddle webhooks are not guaranteed to be ordered — subscription.created can
  // arrive before customer.created. Defensively upsert a minimal customer row
  // first so the FK constraint on subscriptions.customer_id is always satisfied.
  if (sub.customerId) {
    const { error: customerError } = await supabase.from("customers").upsert(
      { 
        customer_id: sub.customerId, 
        email: `pending-${sub.customerId}@placeholder.com`,
        updated_at: new Date().toISOString() 
      },
      { onConflict: "customer_id", ignoreDuplicates: true }
    );
    if (customerError) {
      console.error("Error upserting customer (from subscription event):", customerError);
      throw customerError;
    }
  }

  const { error } = await supabase.from("subscriptions").upsert({
    subscription_id: sub.id,
    customer_id: sub.customerId,
    status: sub.status,
    price_id: sub.items?.[0]?.price?.id || "",
    product_id: sub.items?.[0]?.price?.productId || "",
    scheduled_change_action: sub.scheduledChange?.action || null,
    scheduled_change_at: sub.scheduledChange?.effectiveAt || null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("Error upserting subscription:", error);
    throw error;
  }

  // Fallback to lookup from user_credits if webhook lacks customData (e.g. dashboard cancel)
  if (!userId) {
    const { data: lookup } = await supabase
      .from("user_credits")
      .select("user_id")
      .or(`paddle_subscription_id.eq.${sub.id},paddle_customer_id.eq.${sub.customerId}`)
      .limit(1)
      .single();
    if (lookup) {
      userId = lookup.user_id;
    }
  }

  // Also update user_credits for backwards compatibility in UI
  if (userId) {
    const isFree = sub.status === "canceled" || sub.status === "past_due";
    const newPlanId = isFree ? "free:month" : (sub.items?.[0]?.price?.id || "free:month");

    const { data: existingCredits } = await supabase.from("user_credits").select("plan").eq("user_id", userId).single();
    
    let updatePayload = {
      plan: newPlanId,
      paddle_customer_id: sub.customerId,
      paddle_subscription_id: sub.id
    };

    if (existingCredits && existingCredits.plan !== newPlanId) {
      const newCredits = getCreditsFromPriceId(newPlanId);
      updatePayload.plan_credits = newCredits;
      updatePayload.balance = newCredits; // overwrite balance with new plan credits
    }

    await supabase.from("user_credits").update(updatePayload).eq("user_id", userId);
  }
}

async function upsertCustomer(event) {
  const supabase = getSupabaseClient();
  const customer = event.data;

  const { error } = await supabase.from("customers").upsert({
    customer_id: customer.id,
    email: customer.email,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("Error upserting customer:", error);
    throw error;
  }
}

async function handleTransactionCompleted(event) {
  const supabase = getSupabaseClient();
  const txn = event.data;
  const userId = txn.customData?.userId;
  
  if (userId && txn.status === "completed") {
    console.log(`Transaction completed: ${txn.id} for user ${userId}`);
    
    // Update user_credits plan from the transaction because Paddle subscriptions
    // do not always inherit customData from the checkout session.
    const priceId = txn.items?.[0]?.price?.id;
    if (priceId) {
      const { data: existingCredits } = await supabase.from("user_credits").select("plan").eq("user_id", userId).single();
      
      let updatePayload = {
        plan: priceId,
        paddle_customer_id: txn.customerId || null
      };

      if (existingCredits && existingCredits.plan !== priceId) {
        const newCredits = getCreditsFromPriceId(priceId);
        updatePayload.plan_credits = newCredits;
        updatePayload.balance = newCredits;
      }

      const { error } = await supabase.from("user_credits").update(updatePayload).eq("user_id", userId);
      
      if (error) {
        console.error("Failed to update user_credits plan:", error);
      } else {
        console.log(`Updated user_credits to plan ${priceId} for user ${userId}`);
      }
    }
  }
}
