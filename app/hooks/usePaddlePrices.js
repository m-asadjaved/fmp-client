import { useEffect, useState } from "react";
import { PricingTier } from "../constants/pricing-tier";

function getLineItems() {
  return PricingTier.flatMap((tier) =>
    [tier.priceId.month, tier.priceId.year].map((priceId) => ({
      priceId,
      quantity: 1,
    }))
  );
}

function getPriceAmounts(pricesResponse) {
  return pricesResponse.data.details.lineItems.reduce((acc, item) => {
    acc[item.price.id] = item.formattedTotals.total;
    return acc;
  }, {});
}

export function usePaddlePrices(paddle, country) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paddle) return;

    const params = {
      items: getLineItems(),
      ...(country !== "OTHERS" && { address: { countryCode: country } }),
    };

    setLoading(true);
    paddle.PricePreview(params).then((response) => {
      setPrices((prev) => ({ ...prev, ...getPriceAmounts(response) }));
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to fetch paddle prices:", error);
      setLoading(false);
    });
  }, [country, paddle]);

  return { prices, loading };
}
