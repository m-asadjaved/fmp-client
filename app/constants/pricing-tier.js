export const PricingTier = [
  {
    id: "pro",
    name: "Pro",
    description: "AI Video Clipping",
    features: {
      month: [
        "AI Clipping",
        "Access to APIs",
        "Schedule and Post",
        "30 Video Credits (per month)",
        "1 social account connection"
      ],
      year: [
        "AI Clipping",
        "Access to APIs",
        "Schedule and Post",
        "360 Video Credits (per year)",
        "1 social account connection"
      ]
    },
    featured: false,
    badge: "Best for new creators",
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR || '',
    },
  },
  {
    id: "expert",
    name: "Expert",
    description: "Most Chosen Plan",
    features: {
      month: [
        "Everything in Pro Plan",
        "60 + 10 Bonus Video Credits (per month)",
        "3 social account connections"
      ],
      year: [
        "Everything in Pro Plan",
        "720 + 120 Bonus Video Credits (per year)",
        "3 social account connections"
      ]
    },
    featured: true,
    badge: "Most Popular",
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_EXPERT_YEAR || '',
    },
  },
  {
    id: "business",
    name: "Business",
    description: "Best for Scale",
    features: {
      month: [
        "Everything in Pro Plan",
        "120 + 30 Bonus Video Credits (per month)",
        "Unlimited social account connections"
      ],
      year: [
        "Everything in Pro Plan",
        "1440 + 360 Bonus Video Credits (per year)",
        "Unlimited social account connections"
      ]
    },
    featured: false,
    badge: "Best Value",
    priceId: {
      month: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_MONTH || '',
      year: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_YEAR || '',
    },
  },
];
