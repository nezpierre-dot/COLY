import { MAPBOX_TOKEN } from "./mapbox";

/**
 * Fetch cities for a given country using Mapbox Geocoding API.
 * Returns a sorted list of city names (place type).
 * Much more comprehensive than countriesnow.space.
 */
export async function fetchCitiesByCountry(
  country: string,
  query: string = ""
): Promise<string[]> {
  if (!country) return [];

  // Use the search text or a wildcard-like broad query
  const searchText = query.trim() || "a";

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("types", "place");
  url.searchParams.set("limit", "10");
  url.searchParams.set("language", "fr");

  // Map common country names to ISO codes for the Mapbox country filter
  const isoCode = getCountryISO(country);
  if (isoCode) {
    url.searchParams.set("country", isoCode);
  }

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data?.features) {
      return data.features.map((f: any) => f.text).filter(Boolean);
    }
  } catch {
    // Fallback silently
  }
  return [];
}

/** Common country name → ISO 3166-1 alpha-2 */
const ISO_MAP: Record<string, string> = {
  "France": "FR", "Germany": "DE", "Spain": "ES", "Italy": "IT",
  "United Kingdom": "GB", "United States": "US", "United States of America": "US",
  "Canada": "CA", "Belgium": "BE", "Switzerland": "CH", "Netherlands": "NL",
  "Portugal": "PT", "Austria": "AT", "Poland": "PL", "Sweden": "SE",
  "Norway": "NO", "Denmark": "DK", "Finland": "FI", "Ireland": "IE",
  "Greece": "GR", "Turkey": "TR", "Russia": "RU", "China": "CN",
  "Japan": "JP", "South Korea": "KR", "India": "IN", "Brazil": "BR",
  "Mexico": "MX", "Argentina": "AR", "Australia": "AU", "South Africa": "ZA",
  "Morocco": "MA", "Algeria": "DZ", "Tunisia": "TN", "Egypt": "EG",
  "Senegal": "SN", "Ivory Coast": "CI", "Cote D'Ivoire (Ivory Coast)": "CI",
  "Ivory Coast (Cote D'Ivoire)": "CI", "Cameroon": "CM", "Nigeria": "NG",
  "Saudi Arabia": "SA", "United Arab Emirates": "AE", "Thailand": "TH",
  "Vietnam": "VN", "Indonesia": "ID", "Colombia": "CO", "Chile": "CL",
  "Romania": "RO", "Czech Republic": "CZ", "Hungary": "HU", "Croatia": "HR",
  "Luxembourg": "LU", "Singapore": "SG", "New Zealand": "NZ", "Malaysia": "MY",
  "Philippines": "PH", "Pakistan": "PK", "Bangladesh": "BD", "Peru": "PE",
  "Cuba": "CU", "Israel": "IL", "Lebanon": "LB", "Jordan": "JO",
  "Iraq": "IQ", "Iran": "IR", "Kenya": "KE", "Ghana": "GH",
  "Ethiopia": "ET", "Tanzania": "TZ", "Congo": "CG",
  "Democratic Republic Of The Congo": "CD", "Madagascar": "MG",
  "Mali": "ML", "Niger": "NE", "Burkina Faso": "BF", "Togo": "TG",
  "Benin": "BJ", "Guinea": "GN", "Gabon": "GA", "Mauritania": "MR",
  "Chad": "TD", "Libya": "LY", "Ukraine": "UA", "Andorra": "AD",
  "Albania": "AL", "Armenia": "AM", "Azerbaijan": "AZ", "Belarus": "BY",
  "Bosnia And Herzegovina": "BA", "Bulgaria": "BG", "Cyprus": "CY",
  "Estonia": "EE", "Georgia": "GE", "Iceland": "IS", "Kosovo": "XK",
  "Latvia": "LV", "Liechtenstein": "LI", "Lithuania": "LT", "Malta": "MT",
  "Moldova": "MD", "Monaco": "MC", "Montenegro": "ME",
  "North Macedonia": "MK", "San Marino": "SM", "Serbia": "RS",
  "Slovakia": "SK", "Slovenia": "SI", "Afghanistan": "AF", "Bahrain": "BH",
  "Cambodia": "KH", "North Korea": "KP", "Kuwait": "KW", "Mongolia": "MN",
  "Myanmar": "MM", "Nepal": "NP", "Oman": "OM", "Qatar": "QA",
  "Sri Lanka": "LK", "Syria": "SY", "Taiwan": "TW", "Uzbekistan": "UZ",
  "Yemen": "YE", "Bolivia": "BO", "Costa Rica": "CR",
  "Dominican Republic": "DO", "Ecuador": "EC", "Guatemala": "GT",
  "Haiti": "HT", "Honduras": "HN", "Jamaica": "JM", "Panama": "PA",
  "Paraguay": "PY", "Uruguay": "UY", "Venezuela": "VE", "Angola": "AO",
  "Botswana": "BW", "Mauritius": "MU", "Mozambique": "MZ", "Namibia": "NA",
  "Rwanda": "RW", "Sudan": "SD", "Uganda": "UG", "Zambia": "ZM",
  "Zimbabwe": "ZW",
};

function getCountryISO(country: string): string | null {
  return ISO_MAP[country] || null;
}
