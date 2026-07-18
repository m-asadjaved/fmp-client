import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

async function verify() {
  const apiKey = process.env.PADDLE_SANDBOX_API_KEY;
  const paddle = new Paddle(apiKey, { environment: Environment.sandbox });

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTH;
  console.log("Checking price ID:", priceId);

  try {
    const price = await paddle.prices.get(priceId);
    console.log("✅ Price exists:", price.id, "Status:", price.status);
  } catch (err) {
    console.error("❌ Error fetching price:", err.message);
  }
}

verify().catch(console.error);
