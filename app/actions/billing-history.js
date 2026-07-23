"use server";

import { getPaddleInstance } from "../utils/paddle/get-paddle-instance";
import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { parseMoney } from "../utils/parse-money";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

export async function getBillingHistory(after) {
  try {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
      return { error: "Not authenticated" };
    }

    const email = user.primaryEmailAddress.emailAddress;

    const supabase = getSupabaseClient();
    const { data: customerRow } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("email", email)
      .single();

    if (!customerRow?.customer_id) {
      return { items: [], hasMore: false, total: 0 };
    }

    const paddle = getPaddleInstance();
    const collection = paddle.transactions.list({
      customerId: [customerRow.customer_id],
      status: ["billed", "paid", "past_due", "completed", "canceled"],
      perPage: 10,
      after,
    });

    const transactions = (await collection.next()) ?? [];

    const items = transactions.map((t) => {
      let cardLast4 = null;
      let cardBrand = null;
      
      // Try to extract card info
      if (t.payments && t.payments.length > 0) {
        const payment = t.payments[0];
        if (payment.methodDetails && payment.methodDetails.card) {
          cardLast4 = payment.methodDetails.card.last4;
          cardBrand = payment.methodDetails.card.type || "Card";
        }
      }

      return {
        id: t.id,
        billedAt: t.billedAt ?? null,
        status: t.status,
        total: parseMoney(t.details?.totals?.total, t.currencyCode),
        cardLast4,
        cardBrand
      };
    });

    return {
      items,
      hasMore: collection.hasMore,
      total: collection.estimatedTotal,
    };
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return { error: "Failed to fetch billing history." };
  }
}
