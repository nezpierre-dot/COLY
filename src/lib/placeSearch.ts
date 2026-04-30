/**
 * Place search & reverse-geocoding helpers built on top of Mapbox.
 *
 * - `searchPlaces`        : forward autocomplete on cities (returns city + country
 *                          + ISO + coords). Used by PlaceAutocomplete.
 * - `reverseGeocode`      : coords -> { city, country } (used by "Use current location").
 * - `normalizePlaceText`  : trim + collapse spaces + strip control chars.
 * - `requestUserLocation` : Promise wrapper around geolocation API.
 */
import { MAPBOX_TOKEN } from "./mapbox";

export interface PlaceSuggestion {
  id: string;
  city: string;
  country: string;
  countryCode?: string;
  region?: string;
  label: string; // "City, Region, Country"
  center?: [number, number];
}

/** Trim, collapse internal whitespace, strip control chars. */
export function normalizePlaceText(input: string): string {
  if (!input) return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Forward geocoding — returns up to `limit` city suggestions for `query`. */
export async function searchPlaces(
  query: string,
  opts: { language?: string; limit?: number; signal?: AbortSignal } = {}
): Promise<PlaceSuggestion[]> {
  const q = normalizePlaceText(query);
  if (q.length < 2) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("types", "place");
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", String(opts.limit ?? 5));
  url.searchParams.set("language", opts.language ?? "fr");

  try {
    const res = await fetch(url.toString(), { signal: opts.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const features: any[] = Array.isArray(data?.features) ? data.features : [];
    return features.map((f) => featureToSuggestion(f)).filter(Boolean) as PlaceSuggestion[];
  } catch {
    return [];
  }
}

/** Reverse geocoding from coordinates. */
export async function reverseGeocode(
  lng: number,
  lat: number,
  language = "fr"
): Promise<PlaceSuggestion | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("types", "place");
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", language);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const f = data?.features?.[0];
    return f ? featureToSuggestion(f) : null;
  } catch {
    return null;
  }
}

function featureToSuggestion(f: any): PlaceSuggestion | null {
  const city = f?.text;
  if (!city) return null;
  const ctx: any[] = Array.isArray(f.context) ? f.context : [];
  const countryCtx = ctx.find((c) => String(c.id || "").startsWith("country"));
  const regionCtx = ctx.find((c) => String(c.id || "").startsWith("region"));
  const country = countryCtx?.text || "";
  const region = regionCtx?.text;
  const label = [city, region, country].filter(Boolean).join(", ");
  return {
    id: f.id || `${city}-${country}-${f.center?.join(",")}`,
    city,
    country,
    countryCode: countryCtx?.short_code?.toUpperCase(),
    region,
    label,
    center: Array.isArray(f.center) ? [f.center[0], f.center[1]] : undefined,
  };
}

/** Promise wrapper around `navigator.geolocation.getCurrentPosition`. */
export function requestUserLocation(
  options: PositionOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}
