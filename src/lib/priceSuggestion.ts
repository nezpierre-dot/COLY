/**
 * Calculates a suggested price for a shipment based on:
 * - Distance (estimated from country/city)
 * - Package weight (from size)
 * - Urgency (days until departure)
 * - International coefficient
 */

// Base rates per km bracket
const DISTANCE_RATES: { maxKm: number; ratePerKm: number }[] = [
  { maxKm: 200, ratePerKm: 0.08 },
  { maxKm: 500, ratePerKm: 0.06 },
  { maxKm: 1500, ratePerKm: 0.04 },
  { maxKm: 5000, ratePerKm: 0.03 },
  { maxKm: Infinity, ratePerKm: 0.02 },
];

// Estimated distances by destination type (km)
const DISTANCE_ESTIMATES: Record<string, number> = {
  // Same country (France default)
  local: 150,
  national: 500,
  // International by region
  europe: 1200,
  northAfrica: 2000,
  westAfrica: 4500,
  centralAfrica: 5500,
  middleEast: 4000,
  asia: 8000,
  americas: 7500,
  oceania: 16000,
  default: 3000,
};

// Country → region mapping (simplified)
const COUNTRY_REGIONS: Record<string, string> = {
  france: "local", fr: "local",
  belgique: "europe", belgium: "europe",
  allemagne: "europe", germany: "europe",
  espagne: "europe", spain: "europe",
  italie: "europe", italy: "europe",
  "royaume-uni": "europe", "united kingdom": "europe",
  suisse: "europe", switzerland: "europe",
  portugal: "europe", pays_bas: "europe", netherlands: "europe",
  maroc: "northAfrica", morocco: "northAfrica",
  tunisie: "northAfrica", tunisia: "northAfrica",
  algérie: "northAfrica", algerie: "northAfrica", algeria: "northAfrica",
  égypte: "middleEast", egypt: "middleEast",
  sénégal: "westAfrica", senegal: "westAfrica",
  "côte d'ivoire": "westAfrica", "cote d'ivoire": "westAfrica",
  mali: "westAfrica", guinée: "westAfrica", guinea: "westAfrica",
  cameroun: "centralAfrica", cameroon: "centralAfrica",
  congo: "centralAfrica", gabon: "centralAfrica",
  liban: "middleEast", lebanon: "middleEast",
  turquie: "middleEast", turkey: "middleEast",
  chine: "asia", china: "asia",
  japon: "asia", japan: "asia",
  inde: "asia", india: "asia",
  "états-unis": "americas", "united states": "americas", usa: "americas",
  canada: "americas", brésil: "americas", brazil: "americas",
  australie: "oceania", australia: "oceania",
};

// Weight by size (kg)
const SIZE_WEIGHTS: Record<string, number> = {
  S: 1,
  M: 3,
  L: 5,
  XL: 7,
  XXL: 10,
  other: 5,
};

// Weight multiplier
const WEIGHT_MULTIPLIERS: { maxKg: number; mult: number }[] = [
  { maxKg: 1, mult: 1.0 },
  { maxKg: 3, mult: 1.15 },
  { maxKg: 5, mult: 1.3 },
  { maxKg: 7, mult: 1.5 },
  { maxKg: 10, mult: 1.8 },
  { maxKg: Infinity, mult: 2.2 },
];

function getDistanceEstimate(
  departCountry: string,
  arrCountry: string,
  sameCity: boolean
): number {
  const dKey = departCountry.toLowerCase().trim();
  const aKey = arrCountry.toLowerCase().trim();

  // Same country
  if (dKey === aKey || (!aKey && !dKey)) {
    return sameCity ? 50 : DISTANCE_ESTIMATES.national;
  }

  const region = COUNTRY_REGIONS[aKey] || COUNTRY_REGIONS[dKey];
  if (region === "local") return DISTANCE_ESTIMATES.national;
  return DISTANCE_ESTIMATES[region || "default"];
}

function getDistanceCost(distanceKm: number): number {
  let cost = 0;
  let remaining = distanceKm;

  for (const bracket of DISTANCE_RATES) {
    const inBracket = Math.min(remaining, bracket.maxKm);
    cost += inBracket * bracket.ratePerKm;
    remaining -= inBracket;
    if (remaining <= 0) break;
  }

  return cost;
}

function getWeightMultiplier(weightKg: number): number {
  for (const w of WEIGHT_MULTIPLIERS) {
    if (weightKg <= w.maxKg) return w.mult;
  }
  return 2.2;
}

function getUrgencyMultiplier(departureDate: string): number {
  if (!departureDate) return 1.0;
  const daysUntil = Math.max(
    0,
    Math.floor(
      (new Date(departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  if (daysUntil <= 2) return 1.5; // Very urgent
  if (daysUntil <= 5) return 1.25; // Urgent
  if (daysUntil <= 14) return 1.1; // Normal
  return 1.0; // Flexible
}

export interface PriceSuggestion {
  /** Suggested price in EUR */
  price: number;
  /** Minimum reasonable price */
  min: number;
  /** Maximum reasonable price */
  max: number;
  /** Estimated distance in km */
  distanceKm: number;
  /** Urgency label */
  urgencyLabel: string;
}

export function calculateSuggestedPrice(params: {
  departCountry: string;
  departCity: string;
  arrCountry: string;
  arrCity: string;
  size: string;
  departureDate: string;
  isInternational: boolean;
}): PriceSuggestion {
  const {
    departCountry,
    departCity,
    arrCountry,
    arrCity,
    size,
    departureDate,
    isInternational,
  } = params;

  const sameCity =
    departCity.toLowerCase().trim() === arrCity.toLowerCase().trim() &&
    departCity.length > 0;

  const distanceKm = getDistanceEstimate(departCountry, arrCountry, sameCity);
  const distanceCost = getDistanceCost(distanceKm);
  const weightKg = SIZE_WEIGHTS[size] || 5;
  const weightMult = getWeightMultiplier(weightKg);
  const urgencyMult = getUrgencyMultiplier(departureDate);
  const internationalCoef = isInternational ? 1.2 : 1.0;

  // Base + minimum service fee
  const baseFee = 5;
  const rawPrice =
    baseFee + distanceCost * weightMult * urgencyMult * internationalCoef;

  // Round to nearest 0.5
  const price = Math.round(rawPrice * 2) / 2;
  const min = Math.max(5, Math.round(price * 0.6 * 2) / 2);
  const max = Math.round(price * 1.8 * 2) / 2;

  // Urgency label
  const daysUntil = departureDate
    ? Math.max(
        0,
        Math.floor(
          (new Date(departureDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : -1;

  let urgencyLabel = "Flexible";
  if (daysUntil >= 0 && daysUntil <= 2) urgencyLabel = "Très urgent";
  else if (daysUntil <= 5) urgencyLabel = "Urgent";
  else if (daysUntil <= 14) urgencyLabel = "Normal";

  return { price, min, max, distanceKm, urgencyLabel };
}
