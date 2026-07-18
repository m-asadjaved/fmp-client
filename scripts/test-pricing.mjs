import fs from 'fs';
import { PricingTier } from '../app/constants/pricing-tier.js';

// Load .env to ensure PricingTier is populated
const envConfig = fs.readFileSync(".env", "utf8").split("\n");
for (const line of envConfig) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

function getTierFromPriceId(priceId) {
  if (!priceId || priceId === "free" || priceId === "free:month") return { name: "free", interval: "month" };
  
  const cleanId = priceId.trim();
  console.log("cleanId:", cleanId);
  
  for (const tier of PricingTier) {
    console.log(`Checking tier ${tier.id}: month=${tier.priceId.month}, year=${tier.priceId.year}`);
    if (tier.priceId.month && tier.priceId.month.trim() === cleanId) return { name: tier.id, interval: "month" };
    if (tier.priceId.year && tier.priceId.year.trim() === cleanId) return { name: tier.id, interval: "year" };
  }
  
  if (cleanId.includes(":")) {
    const [tier, interval] = cleanId.split(":");
    return { name: tier, interval };
  }
  
  return { name: cleanId, interval: "month" };
}

console.log("RESULT:", getTierFromPriceId("pri_01kxtpqnqnt90va0vsgv2zbnvs"));
