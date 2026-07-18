import { NextResponse } from "next/server";
import { getPaddleInstance } from "../../../utils/paddle/get-paddle-instance";
import { processEvent } from "../../../utils/paddle/process-webhook";

export async function POST(req) {
  const signature = req.headers.get("paddle-signature");
  const rawBody = await req.text(); // Pass RAW request body to unmarshal
  const secretKey = process.env.PADDLE_WEBHOOK_SECRET || "";

  // Pre-validate inputs
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body" }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    // Verify the webhook signature. Throws on mismatch, expired timestamp, etc.
    const eventData = await paddle.webhooks.unmarshal(rawBody, secretKey, signature);

    if (eventData) {
      await processEvent(eventData);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    // Any non-2xx tells Paddle to retry. 500 covers signature failure AND sync errors.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
