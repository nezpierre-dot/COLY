import { useCallback } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";
import type { AppLocale } from "@/lib/geoLocalization";
import { setPreferredLanguage } from "@/lib/geoLocalization";

/**
 * Backwards-compatible hook over `react-i18next`.
 *
 * Same API as before — `{ t, language, setLanguage }` — so the 46+ existing
 * call sites keep working unchanged. Under the hood we now benefit from
 * i18next interpolation (`t("key", { var: 42 })`), pluralization, and
 * proper re-render on language change via React context.
 */
export const useTranslation = () => {
  const { t: i18nT, i18n } = useI18nextTranslation();

  const setLanguage = useCallback(
    (locale: AppLocale) => {
      setPreferredLanguage(locale);
      i18n.changeLanguage(locale);
    },
    [i18n],
  );

  // Wrap so the return type stays `string` (not the union i18next gives back).
  const t = useCallback(
    (key: string, options?: Record<string, unknown>) => i18nT(key, options) as string,
    [i18nT],
  );

  return {
    t,
    language: (i18n.resolvedLanguage ?? i18n.language ?? "fr") as AppLocale,
    setLanguage,
  };
};
