import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import dotenv from "dotenv";
dotenv.config();

const paddle = new Paddle(process.env.PADDLE_SANDBOX_API_KEY, {
  environment: Environment.sandbox,
});

async function seed() {
  const result = {};

  try {
    console.log("Creating Pro product...");
    const pro = await paddle.products.create({
      name: "Pro",
      taxCategory: "saas",
      description: "AI Video Clipping",
    });

    const proMonthly = await paddle.prices.create({
      productId: pro.id,
      description: "Pro Monthly",
      unitPrice: { amount: "1500", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });

    const proYearly = await paddle.prices.create({
      productId: pro.id,
      description: "Pro Yearly",
      unitPrice: { amount: "7200", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });
    
    result.pro = { product: pro.id, monthly: proMonthly.id, yearly: proYearly.id };

    console.log("Creating Expert product...");
    const expert = await paddle.products.create({
      name: "Expert",
      taxCategory: "saas",
      description: "Most Chosen Plan",
    });

    const expertMonthly = await paddle.prices.create({
      productId: expert.id,
      description: "Expert Monthly",
      unitPrice: { amount: "3000", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });

    const expertYearly = await paddle.prices.create({
      productId: expert.id,
      description: "Expert Yearly",
      unitPrice: { amount: "14400", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });
    
    result.expert = { product: expert.id, monthly: expertMonthly.id, yearly: expertYearly.id };

    console.log("Creating Business product...");
    const business = await paddle.products.create({
      name: "Business",
      taxCategory: "saas",
      description: "Best for Scale",
    });

    const businessMonthly = await paddle.prices.create({
      productId: business.id,
      description: "Business Monthly",
      unitPrice: { amount: "6000", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });

    const businessYearly = await paddle.prices.create({
      productId: business.id,
      description: "Business Yearly",
      unitPrice: { amount: "28800", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    });
    
    result.business = { product: business.id, monthly: businessMonthly.id, yearly: businessYearly.id };

    console.log("\n==================== SUCCESS ====================");
    console.log("Update your .env file with the following values:");
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH=${result.pro.monthly}`);
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR=${result.pro.yearly}`);
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_EXPERT_MONTH=${result.expert.monthly}`);
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_EXPERT_YEAR=${result.expert.yearly}`);
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_MONTH=${result.business.monthly}`);
    console.log(`NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_YEAR=${result.business.yearly}`);
    console.log("=================================================\n");

  } catch (error) {
    console.error("Error creating catalog:", error);
  }
}

seed();
