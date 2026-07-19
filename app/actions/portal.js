"use server";

import { getPaddleInstance } from "../utils/paddle/get-paddle-instance";
import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

export async function createPortalSession() {
  // 1. Authenticate using Clerk
  const user = await currentUser();
  if (!user || !user.primaryEmailAddress?.emailAddress) {
    return { error: "Not authenticated" };
  }

  const email = user.primaryEmailAddress.emailAddress;

  // 2. Look up the Paddle customer_id via the email bridge
  const supabase = getSupabaseClient();
  const { data: customerRow } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("email", email)
    .single();

  if (!customerRow?.customer_id) {
    return { error: "No Paddle customer found. Please subscribe to a plan first." };
  }

  // 3. Look up the customer's active subscriptions for deep links
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("subscription_id")
    .eq("customer_id", customerRow.customer_id);

  const subscriptionIds = (subRows || []).map((r) => r.subscription_id);

  try {
    // 4. Mint the session securely server-side
    const paddle = getPaddleInstance();
    const session = await paddle.customerPortalSessions.create(
      customerRow.customer_id,
      subscriptionIds
    );

    // 5. Return ONLY the URL
    return { url: session.urls.general.overview };
  } catch (error) {
    console.error("Error creating portal session:", error);
    return { error: "Failed to generate portal session." };
  }
}
