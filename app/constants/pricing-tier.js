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
        "1 social account connection",
        "720p HD Exports",
        "No Watermarks",
        "Standard Support",
        "AI Auto-Framing",
        "Background Noise Removal",
        "Custom Video Templates (Basic)",
        "Standard Transitions",
        "10GB Cloud Storage",
        "Export to TikTok, Reels, Shorts"
      ],
      year: [
        "AI Clipping",
        "Access to APIs",
        "Schedule and Post",
        "360 Video Credits (per year)",
        "1 social account connection",
        "720p HD Exports",
        "No Watermarks",
        "Standard Support",
        "AI Auto-Framing",
        "Background Noise Removal",
        "Custom Video Templates (Basic)",
        "Standard Transitions",
        "10GB Cloud Storage",
        "Export to TikTok, Reels, Shorts"
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
        "3 social account connections",
        "1080p Full HD Exports",
        "Advanced AI Captions",
        "Priority Support",
        "AI B-Roll Generation",
        "Advanced Color Grading",
        "Custom Brand Kit",
        "Multi-track Audio Editing",
        "50GB Cloud Storage",
        "Auto-translations (10 languages)",
        "Batch Exporting"
      ],
      year: [
        "Everything in Pro Plan",
        "720 + 120 Bonus Video Credits (per year)",
        "3 social account connections",
        "1080p Full HD Exports",
        "Advanced AI Captions",
        "Priority Support",
        "AI B-Roll Generation",
        "Advanced Color Grading",
        "Custom Brand Kit",
        "Multi-track Audio Editing",
        "50GB Cloud Storage",
        "Auto-translations (10 languages)",
        "Batch Exporting"
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
        "Everything in Expert Plan",
        "120 + 30 Bonus Video Credits (per month)",
        "Unlimited social account connections",
        "4K Ultra HD Exports",
        "Team Collaboration",
        "24/7 Dedicated Support",
        "Custom AI Models",
        "White-label Video Player",
        "API Access for Automation",
        "500GB Cloud Storage",
        "Dedicated Account Manager",
        "SSO & Advanced Security",
        "Auto-translations (50+ languages)"
      ],
      year: [
        "Everything in Expert Plan",
        "1440 + 360 Bonus Video Credits (per year)",
        "Unlimited social account connections",
        "4K Ultra HD Exports",
        "Team Collaboration",
        "24/7 Dedicated Support",
        "Custom AI Models",
        "White-label Video Player",
        "API Access for Automation",
        "500GB Cloud Storage",
        "Dedicated Account Manager",
        "SSO & Advanced Security",
        "Auto-translations (50+ languages)"
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
