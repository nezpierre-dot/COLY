import { useState, useCallback, useMemo } from "react";
import { getPreferredLanguage, setPreferredLanguage, type AppLocale } from "@/lib/geoLocalization";
import { getT } from "@/lib/i18n";

export const useTranslation = () => {
  const [language, setLangState] = useState<AppLocale>(getPreferredLanguage);

  const setLanguage = useCallback((locale: AppLocale) => {
    setPreferredLanguage(locale);
    setLangState(locale);
  }, []);

  const t = useMemo(() => getT(language), [language]);

  return { t, language, setLanguage };
};
