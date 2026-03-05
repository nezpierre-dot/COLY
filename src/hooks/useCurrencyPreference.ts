import { useState, useCallback } from "react";

export type CurrencyOption = {
  code: string;
  symbol: string;
  label: string;
  flag: string;
};

export const AVAILABLE_CURRENCIES: CurrencyOption[] = [
  { code: "EUR", symbol: "€", label: "Euro (€)", flag: "🇪🇺" },
  { code: "USD", symbol: "$", label: "Dollar US ($)", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", label: "Livre sterling (£)", flag: "🇬🇧" },
  { code: "CAD", symbol: "CA$", label: "Dollar canadien (CA$)", flag: "🇨🇦" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse (CHF)", flag: "🇨🇭" },
  { code: "XOF", symbol: "CFA", label: "Franc CFA BCEAO (CFA)", flag: "🇸🇳" },
  { code: "XAF", symbol: "CFA", label: "Franc CFA BEAC (CFA)", flag: "🇨🇲" },
  { code: "MAD", symbol: "MAD", label: "Dirham marocain (MAD)", flag: "🇲🇦" },
  { code: "TND", symbol: "TND", label: "Dinar tunisien (TND)", flag: "🇹🇳" },
  { code: "DZD", symbol: "DZD", label: "Dinar algérien (DZD)", flag: "🇩🇿" },
];

const STORAGE_KEY = "preferred-currency";

// Map browser locale to currency code for auto-detect
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  fr: "EUR", en: "USD", "en-us": "USD", "en-gb": "GBP", "en-ca": "CAD",
  de: "EUR", "de-ch": "CHF", "fr-ch": "CHF", "it-ch": "CHF",
  es: "EUR", pt: "EUR", it: "EUR", ar: "MAD",
  "ar-ma": "MAD", "ar-tn": "TND", "ar-dz": "DZD",
  "fr-sn": "XOF", "fr-ci": "XOF", "fr-ml": "XOF",
  "fr-cm": "XAF", "fr-ga": "XAF", "fr-cd": "XAF",
  "fr-ca": "CAD",
};

function detectCurrency(): CurrencyOption {
  try {
    const langs = navigator.languages || [navigator.language];
    for (const lang of langs) {
      const lower = lang.toLowerCase();
      if (LOCALE_CURRENCY_MAP[lower]) {
        const found = AVAILABLE_CURRENCIES.find(c => c.code === LOCALE_CURRENCY_MAP[lower]);
        if (found) return found;
      }
      const short = lower.split("-")[0];
      if (LOCALE_CURRENCY_MAP[short]) {
        const found = AVAILABLE_CURRENCIES.find(c => c.code === LOCALE_CURRENCY_MAP[short]);
        if (found) return found;
      }
    }
  } catch {}
  return AVAILABLE_CURRENCIES[0];
}

/** Returns the user's preferred currency code & symbol (auto-detects on first visit). */
export const getPreferredCurrency = (): CurrencyOption => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = AVAILABLE_CURRENCIES.find(c => c.code === stored);
      if (found) return found;
    }
  } catch {}
  // Auto-detect and persist
  const detected = detectCurrency();
  try { localStorage.setItem(STORAGE_KEY, detected.code); } catch {}
  return detected;
};

/** Shortcut: returns just the symbol string */
export const getCurrencySymbol = (): string => getPreferredCurrency().symbol;

export const useCurrencyPreference = () => {
  const [currency, setCurrencyState] = useState<CurrencyOption>(getPreferredCurrency);

  const setCurrency = useCallback((code: string) => {
    const found = AVAILABLE_CURRENCIES.find(c => c.code === code);
    if (found) {
      localStorage.setItem(STORAGE_KEY, code);
      setCurrencyState(found);
    }
  }, []);

  return { currency, setCurrency };
};
