import { useState, useCallback } from "react";
import {
  type AppLocale,
  AVAILABLE_LANGUAGES,
  getPreferredLanguage,
  setPreferredLanguage,
} from "@/lib/geoLocalization";

export { AVAILABLE_LANGUAGES, type AppLocale };

export const useLanguagePreference = () => {
  const [language, setLanguageState] = useState<AppLocale>(getPreferredLanguage);

  const setLanguage = useCallback((locale: AppLocale) => {
    setPreferredLanguage(locale);
    setLanguageState(locale);
  }, []);

  const currentLabel = AVAILABLE_LANGUAGES.find(l => l.code === language);

  return { language, setLanguage, currentLabel };
};
