export function convertAmountFromLowestUnit(
  amount,
  currency,
) {
  // JPY, KRW, and CLP have no minor units
  switch (currency) {
    case "JPY":
    case "KRW":
    case "CLP":
      return parseFloat(amount);
    default:
      return parseFloat(amount) / 100;
  }
}

export function formatMoney(amount, currency) {
  const language =
    typeof navigator !== "undefined" ? navigator.language : "en-US";
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency,
  }).format(amount);
}

export function parseMoney(
  amount = "0",
  currency = "USD",
) {
  return formatMoney(convertAmountFromLowestUnit(amount, currency), currency);
}
