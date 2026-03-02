import { useState, useEffect, useRef } from "react";

// Continent mapping by country name
const CONTINENT_MAP: Record<string, string> = {
  // Africa
  "Algeria": "AF", "Angola": "AF", "Benin": "AF", "Botswana": "AF", "Burkina Faso": "AF",
  "Burundi": "AF", "Cameroon": "AF", "Cape Verde": "AF", "Central African Republic": "AF",
  "Chad": "AF", "Comoros": "AF", "Congo": "AF", "Ivory Coast": "AF", "Djibouti": "AF",
  "Egypt": "AF", "Equatorial Guinea": "AF", "Eritrea": "AF", "Eswatini": "AF", "Ethiopia": "AF",
  "Gabon": "AF", "Gambia": "AF", "Ghana": "AF", "Guinea": "AF", "Guinea-Bissau": "AF",
  "Kenya": "AF", "Lesotho": "AF", "Liberia": "AF", "Libya": "AF", "Madagascar": "AF",
  "Malawi": "AF", "Mali": "AF", "Mauritania": "AF", "Mauritius": "AF", "Morocco": "AF",
  "Mozambique": "AF", "Namibia": "AF", "Niger": "AF", "Nigeria": "AF", "Rwanda": "AF",
  "Sao Tome And Principe": "AF", "Senegal": "AF", "Seychelles": "AF", "Sierra Leone": "AF",
  "Somalia": "AF", "South Africa": "AF", "South Sudan": "AF", "Sudan": "AF", "Tanzania": "AF",
  "Togo": "AF", "Tunisia": "AF", "Uganda": "AF", "Zambia": "AF", "Zimbabwe": "AF",
  "Democratic Republic Of The Congo": "AF", "Cote D'Ivoire (Ivory Coast)": "AF",
  // Europe
  "Albania": "EU", "Andorra": "EU", "Austria": "EU", "Belarus": "EU", "Belgium": "EU",
  "Bosnia And Herzegovina": "EU", "Bulgaria": "EU", "Croatia": "EU", "Cyprus": "EU",
  "Czech Republic": "EU", "Denmark": "EU", "Estonia": "EU", "Finland": "EU", "France": "EU",
  "Germany": "EU", "Greece": "EU", "Hungary": "EU", "Iceland": "EU", "Ireland": "EU",
  "Italy": "EU", "Kosovo": "EU", "Latvia": "EU", "Liechtenstein": "EU", "Lithuania": "EU",
  "Luxembourg": "EU", "Malta": "EU", "Moldova": "EU", "Monaco": "EU", "Montenegro": "EU",
  "Netherlands": "EU", "North Macedonia": "EU", "Norway": "EU", "Poland": "EU", "Portugal": "EU",
  "Romania": "EU", "Russia": "EU", "San Marino": "EU", "Serbia": "EU", "Slovakia": "EU",
  "Slovenia": "EU", "Spain": "EU", "Sweden": "EU", "Switzerland": "EU", "Ukraine": "EU",
  "United Kingdom": "EU", "Vatican City": "EU",
  // Asia
  "Afghanistan": "AS", "Armenia": "AS", "Azerbaijan": "AS", "Bahrain": "AS", "Bangladesh": "AS",
  "Bhutan": "AS", "Brunei": "AS", "Cambodia": "AS", "China": "AS", "Georgia": "AS",
  "India": "AS", "Indonesia": "AS", "Iran": "AS", "Iraq": "AS", "Israel": "AS", "Japan": "AS",
  "Jordan": "AS", "Kazakhstan": "AS", "Kuwait": "AS", "Kyrgyzstan": "AS", "Laos": "AS",
  "Lebanon": "AS", "Malaysia": "AS", "Maldives": "AS", "Mongolia": "AS", "Myanmar": "AS",
  "Nepal": "AS", "North Korea": "AS", "Oman": "AS", "Pakistan": "AS", "Palestine": "AS",
  "Philippines": "AS", "Qatar": "AS", "Saudi Arabia": "AS", "Singapore": "AS",
  "South Korea": "AS", "Sri Lanka": "AS", "Syria": "AS", "Taiwan": "AS", "Tajikistan": "AS",
  "Thailand": "AS", "Timor-Leste": "AS", "Turkey": "AS", "Turkmenistan": "AS",
  "United Arab Emirates": "AS", "Uzbekistan": "AS", "Vietnam": "AS", "Yemen": "AS",
  // North America
  "Antigua And Barbuda": "NA", "Bahamas": "NA", "Barbados": "NA", "Belize": "NA", "Canada": "NA",
  "Costa Rica": "NA", "Cuba": "NA", "Dominica": "NA", "Dominican Republic": "NA",
  "El Salvador": "NA", "Grenada": "NA", "Guatemala": "NA", "Haiti": "NA", "Honduras": "NA",
  "Jamaica": "NA", "Mexico": "NA", "Nicaragua": "NA", "Panama": "NA",
  "Saint Kitts And Nevis": "NA", "Saint Lucia": "NA", "Saint Vincent And The Grenadines": "NA",
  "Trinidad And Tobago": "NA", "United States": "NA",
  // South America
  "Argentina": "SA", "Bolivia": "SA", "Brazil": "SA", "Chile": "SA", "Colombia": "SA",
  "Ecuador": "SA", "Guyana": "SA", "Paraguay": "SA", "Peru": "SA", "Suriname": "SA",
  "Uruguay": "SA", "Venezuela": "SA",
  // Oceania
  "Australia": "OC", "Fiji": "OC", "Kiribati": "OC", "Marshall Islands": "OC",
  "Micronesia": "OC", "Nauru": "OC", "New Zealand": "OC", "Palau": "OC",
  "Papua New Guinea": "OC", "Samoa": "OC", "Solomon Islands": "OC", "Tonga": "OC",
  "Tuvalu": "OC", "Vanuatu": "OC",
};

// Approximate coordinates for major cities (fallback by country capital)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "France": [48.86, 2.35], "Germany": [52.52, 13.41], "Spain": [40.42, -3.7],
  "Italy": [41.9, 12.5], "United Kingdom": [51.51, -0.13], "United States": [38.9, -77.04],
  "Canada": [45.42, -75.7], "Brazil": [-15.78, -47.93], "Argentina": [-34.6, -58.38],
  "China": [39.9, 116.4], "Japan": [35.68, 139.69], "India": [28.61, 77.21],
  "Australia": [-33.87, 151.21], "South Africa": [-33.93, 18.42], "Morocco": [33.97, -6.85],
  "Algeria": [36.75, 3.06], "Tunisia": [36.81, 10.18], "Egypt": [30.04, 31.24],
  "Nigeria": [9.06, 7.49], "Senegal": [14.69, -17.44], "Turkey": [39.93, 32.86],
  "Russia": [55.76, 37.62], "Mexico": [19.43, -99.13], "Colombia": [4.71, -74.07],
  "Belgium": [50.85, 4.35], "Netherlands": [52.37, 4.9], "Portugal": [38.72, -9.14],
  "Switzerland": [46.95, 7.45], "Poland": [52.23, 21.01], "Sweden": [59.33, 18.07],
  "Norway": [59.91, 10.75], "Austria": [48.21, 16.37], "Greece": [37.98, 23.73],
  "Saudi Arabia": [24.71, 46.68], "United Arab Emirates": [25.2, 55.27],
  "Thailand": [13.76, 100.5], "Indonesia": [-6.21, 106.85], "Malaysia": [3.14, 101.69],
  "South Korea": [37.57, 126.98], "Vietnam": [21.03, 105.85], "Philippines": [14.6, 120.98],
  "Pakistan": [33.69, 73.04], "Bangladesh": [23.81, 90.41], "Kenya": [-1.29, 36.82],
  "Ghana": [5.56, -0.19], "Cameroon": [3.87, 11.52], "Chile": [-33.45, -70.67],
  "Peru": [-12.05, -77.04], "Cuba": [23.11, -82.37], "Dominican Republic": [18.49, -69.93],
  "New Zealand": [-41.29, 174.78],
};

function getContinent(country: string): string | null {
  if (CONTINENT_MAP[country]) return CONTINENT_MAP[country];
  // Fuzzy match
  const lower = country.toLowerCase();
  for (const [k, v] of Object.entries(CONTINENT_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type DisabledTransports = Record<string, string>; // transport value → reason

export function useTransportFeasibility(
  departureCountry: string,
  departureCity: string,
  arrivalCountry: string,
  arrivalCity: string,
) {
  const [disabled, setDisabled] = useState<DisabledTransports>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!departureCountry || !arrivalCountry || !departureCity || !arrivalCity) {
      setDisabled({});
      return;
    }

    timerRef.current = setTimeout(() => {
      const contDep = getContinent(departureCountry);
      const contArr = getContinent(arrivalCountry);
      const diffContinent = contDep && contArr && contDep !== contArr;

      // Estimate distance
      const coordDep = COUNTRY_COORDS[departureCountry];
      const coordArr = COUNTRY_COORDS[arrivalCountry];
      const dist = coordDep && coordArr ? haversineKm(...coordDep, ...coordArr) : 0;

      const shouldDisable = diffContinent || dist > 800;

      if (shouldDisable) {
        const reason = diffContinent
          ? "traversée océanique"
          : "distance trop longue";
        setDisabled({
          train: `Impossible par Train entre ces villes (${reason})`,
          bus: `Impossible par Bus entre ces villes (${reason})`,
          voiture: `Impossible par Voiture entre ces villes (${reason})`,
          bateau: `Impossible par Bateau entre ces villes (${reason})`,
        });
      } else {
        setDisabled({});
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [departureCountry, departureCity, arrivalCountry, arrivalCity]);

  return disabled;
}
