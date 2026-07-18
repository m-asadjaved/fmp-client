export const PricingTier = [
  {
    id: "starter",
    name: "Starter",
    description: "Basic features for individuals.",
    features: [
      "1 workspace",
      "7-day free trial",
      "Limited collaboration",
      "Standard support",
    ],
    featured: false,
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEAR || '',
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "For scaling teams.",
    features: [
      "Up to 5 workspaces",
      "7-day free trial",
      "Advanced collaboration",
      "Priority support",
    ],
    featured: true,
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR || '',
    },
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "For power users and enterprises.",
    features: [
      "Unlimited workspaces",
      "7-day free trial",
      "Custom permissions",
      "24/7 dedicated support",
    ],
    featured: false,
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_YEAR || '',
    },
  },
];
