import { createClient } from "@supabase/supabase-js";
import { EventName } from "@paddle/paddle-node-sdk";

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
  const userId = sub.customData?.userId;

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

  // Also update user_credits for backwards compatibility in UI
  if (userId) {
    const isFree = sub.status === "canceled" || sub.status === "past_due";
    await supabase.from("user_credits").update({
      plan: isFree ? "free:month" : (sub.items?.[0]?.price?.id || "free:month")
    }).eq("user_id", userId);
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
      const { error } = await supabase.from("user_credits").update({
        plan: priceId
      }).eq("user_id", userId);
      
      if (error) {
        console.error("Failed to update user_credits plan:", error);
      } else {
        console.log(`Updated user_credits to plan ${priceId} for user ${userId}`);
      }
    }
  }
}
