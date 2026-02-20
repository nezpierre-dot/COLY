// Locale-aware currency, weight, and dimension units based on country

const IMPERIAL_COUNTRIES = [
  "United States", "United States of America", "USA",
  "Liberia", "Myanmar", "United Kingdom",
];

const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  "France": { symbol: "€", code: "EUR" },
  "Germany": { symbol: "€", code: "EUR" },
  "Italy": { symbol: "€", code: "EUR" },
  "Spain": { symbol: "€", code: "EUR" },
  "Belgium": { symbol: "€", code: "EUR" },
  "Netherlands": { symbol: "€", code: "EUR" },
  "Portugal": { symbol: "€", code: "EUR" },
  "Austria": { symbol: "€", code: "EUR" },
  "Ireland": { symbol: "€", code: "EUR" },
  "Finland": { symbol: "€", code: "EUR" },
  "Greece": { symbol: "€", code: "EUR" },
  "Luxembourg": { symbol: "€", code: "EUR" },
  "Estonia": { symbol: "€", code: "EUR" },
  "Latvia": { symbol: "€", code: "EUR" },
  "Lithuania": { symbol: "€", code: "EUR" },
  "Slovakia": { symbol: "€", code: "EUR" },
  "Slovenia": { symbol: "€", code: "EUR" },
  "Malta": { symbol: "€", code: "EUR" },
  "Cyprus": { symbol: "€", code: "EUR" },
  "Croatia": { symbol: "€", code: "EUR" },
  "United States": { symbol: "$", code: "USD" },
  "United States of America": { symbol: "$", code: "USD" },
  "United Kingdom": { symbol: "£", code: "GBP" },
  "Japan": { symbol: "¥", code: "JPY" },
  "China": { symbol: "¥", code: "CNY" },
  "South Korea": { symbol: "₩", code: "KRW" },
  "Canada": { symbol: "CA$", code: "CAD" },
  "Australia": { symbol: "A$", code: "AUD" },
  "Switzerland": { symbol: "CHF", code: "CHF" },
  "Brazil": { symbol: "R$", code: "BRL" },
  "India": { symbol: "₹", code: "INR" },
  "Morocco": { symbol: "MAD", code: "MAD" },
  "Senegal": { symbol: "CFA", code: "XOF" },
  "Ivory Coast": { symbol: "CFA", code: "XOF" },
  "Cameroon": { symbol: "CFA", code: "XAF" },
  "Tunisia": { symbol: "TND", code: "TND" },
  "Algeria": { symbol: "DZD", code: "DZD" },
  "Turkey": { symbol: "₺", code: "TRY" },
  "Russia": { symbol: "₽", code: "RUB" },
  "Mexico": { symbol: "MX$", code: "MXN" },
  "Nigeria": { symbol: "₦", code: "NGN" },
  "South Africa": { symbol: "R", code: "ZAR" },
  "Thailand": { symbol: "฿", code: "THB" },
  "Saudi Arabia": { symbol: "SAR", code: "SAR" },
  "United Arab Emirates": { symbol: "AED", code: "AED" },
};

export const getCurrencyForCountry = (country: string): { symbol: string; code: string } => {
  return CURRENCY_MAP[country] || { symbol: "$", code: "USD" };
};

export const getUnitsForCountry = (country: string) => {
  const isImperial = IMPERIAL_COUNTRIES.includes(country);
  return {
    weight: isImperial ? "oz" : "kg",
    weightLabel: isImperial ? "oz" : "kg",
    weightPlaceholder: isImperial ? "Poids (en onces)" : "Poids (en kg)",
    dimension: isImperial ? "in" : "cm",
    dimensionSmall: isImperial ? "in" : "mm",
    dimensionPlaceholder: isImperial ? "Dimensions (en pouces)" : "Dimensions (en cm)",
    isImperial,
  };
};

/** Format a size label with locale-appropriate units */
export const formatSizeLabel = (label: string, country: string): string => {
  const units = getUnitsForCountry(country);
  if (units.isImperial) {
    // Convert kg to oz in labels like "Max 1kg"
    return label
      .replace(/(\d+)kg/g, (_, n) => `${(parseFloat(n) * 35.274).toFixed(0)}oz`)
      .replace(/(\d+)×(\d+)×(\d+)/g, (_, a, b, c) =>
        `${(parseFloat(a) / 25.4).toFixed(1)}×${(parseFloat(b) / 25.4).toFixed(1)}×${(parseFloat(c) / 25.4).toFixed(1)}`
      );
  }
  return label;
};

/** Format a price string with locale currency */
export const formatPrice = (priceEur: number, country: string): string => {
  const { symbol } = getCurrencyForCountry(country);
  return `${priceEur.toFixed(2)}${symbol}`;
};
