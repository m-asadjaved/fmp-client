import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import dotenv from "dotenv";
dotenv.config();

const paddle = new Paddle(process.env.PADDLE_SANDBOX_API_KEY, {
  environment: Environment.sandbox,
});

async function seed() {
  const result = {};

  try {
    console.log("Creating Starter product...");
    const starter = await paddle.products.create({
      name: "Starter",
      taxCategory: "saas",
      description: "Basic features for individuals.",
    });

    const starterMonthly = await paddle.prices.create({
      productId: starter.id,
      description: "Starter Monthly",
      unitPrice: { amount: "1000", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "800", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "900", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "1500", currencyCode: "AUD" } },
      ],
    });

    const starterYearly = await paddle.prices.create({
      productId: starter.id,
      description: "Starter Yearly",
      unitPrice: { amount: "10000", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "8000", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "9000", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "15000", currencyCode: "AUD" } },
      ],
    });
    
    result.starter = { product: starter.id, monthly: starterMonthly.id, yearly: starterYearly.id };

    console.log("Creating Pro product...");
    const pro = await paddle.products.create({
      name: "Pro",
      taxCategory: "saas",
      description: "For scaling teams.",
    });

    const proMonthly = await paddle.prices.create({
      productId: pro.id,
      description: "Pro Monthly",
      unitPrice: { amount: "4000", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "3200", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "3600", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "6000", currencyCode: "AUD" } },
      ],
    });

    const proYearly = await paddle.prices.create({
      productId: pro.id,
      description: "Pro Yearly",
      unitPrice: { amount: "40000", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "32000", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "36000", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "60000", currencyCode: "AUD" } },
      ],
    });
    
    result.pro = { product: pro.id, monthly: proMonthly.id, yearly: proYearly.id };

    console.log("Creating Advanced product...");
    const advanced = await paddle.products.create({
      name: "Advanced",
      taxCategory: "saas",
      description: "For power users and enterprises.",
    });

    const advancedMonthly = await paddle.prices.create({
      productId: advanced.id,
      description: "Advanced Monthly",
      unitPrice: { amount: "12000", currencyCode: "USD" },
      billingCycle: { interval: "month", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "9500", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "10900", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "18000", currencyCode: "AUD" } },
      ],
    });

    const advancedYearly = await paddle.prices.create({
      productId: advanced.id,
      description: "Advanced Yearly",
      unitPrice: { amount: "120000", currencyCode: "USD" },
      billingCycle: { interval: "year", frequency: 1 },
      trialPeriod: { interval: "day", frequency: 7 },
      unitPriceOverrides: [
        { countryCodes: ["GB"], unitPrice: { amount: "95000", currencyCode: "GBP" } },
        { countryCodes: ["IE"], unitPrice: { amount: "109000", currencyCode: "EUR" } },
        { countryCodes: ["AU"], unitPrice: { amount: "180000", currencyCode: "AUD" } },
      ],
    });
    
    result.advanced = { product: advanced.id, monthly: advancedMonthly.id, yearly: advancedYearly.id };

    console.log("\n==================== SUCCESS ====================");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("Error creating catalog:", error);
  }
}

seed();
