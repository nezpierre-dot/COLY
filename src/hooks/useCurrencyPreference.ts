import { useState, useCallback } from "react";

export type CurrencyOption = {
  code: string;
  symbol: string;
  label: string;
};

export const AVAILABLE_CURRENCIES: CurrencyOption[] = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "Dollar US ($)" },
  { code: "GBP", symbol: "£", label: "Livre sterling (£)" },
  { code: "CAD", symbol: "CA$", label: "Dollar canadien (CA$)" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse (CHF)" },
  { code: "XOF", symbol: "CFA", label: "Franc CFA BCEAO (CFA)" },
  { code: "XAF", symbol: "CFA", label: "Franc CFA BEAC (CFA)" },
  { code: "MAD", symbol: "MAD", label: "Dirham marocain (MAD)" },
  { code: "TND", symbol: "TND", label: "Dinar tunisien (TND)" },
  { code: "DZD", symbol: "DZD", label: "Dinar algérien (DZD)" },
];

const STORAGE_KEY = "preferred-currency";

/** Returns the user's preferred currency code & symbol (defaults to EUR). */
export const getPreferredCurrency = (): CurrencyOption => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = AVAILABLE_CURRENCIES.find(c => c.code === stored);
      if (found) return found;
    }
  } catch {}
  return AVAILABLE_CURRENCIES[0]; // EUR
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
