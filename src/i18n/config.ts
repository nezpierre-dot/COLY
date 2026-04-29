/**
 * i18next configuration.
 *
 * Strategy: backwards-compatible migration.
 * We import the existing flat dictionaries from `src/lib/i18n.ts` and
 * register them as a single `translation` namespace per locale.
 * This preserves every existing key (e.g. "dashboard.title") used across
 * the 46+ components that import `useTranslation` — no component edits needed.
 *
 * Benefits gained from i18next:
 *  - Pluralization support
 *  - Interpolation {{var}}
 *  - Async loading hooks (future-ready)
 *  - Standard ecosystem (Suspense, Trans component, namespaces)
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { dictionaries } from "@/lib/i18nDictionaries";
import type { AppLocale } from "@/lib/geoLocalization";
import { getPreferredLanguage, setPreferredLanguage } from "@/lib/geoLocalization";

// Build i18next resources from existing flat dicts (key -> string)
const resources = Object.fromEntries(
  Object.entries(dictionaries).map(([locale, dict]) => [
    locale,
    { translation: dict },
  ]),
);

const initialLang: AppLocale = getPreferredLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "es", "de", "pt", "it", "ar"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
    returnEmptyString: false,
  });

// Keep our existing geoLocalization preference in sync with i18next
i18n.on("languageChanged", (lng) => {
  if (["fr", "en", "es", "de", "pt", "it", "ar"].includes(lng)) {
    setPreferredLanguage(lng as AppLocale);
    // Also update <html lang>
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
      document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    }
  }
});

// Set initial <html lang> + dir
if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
  document.documentElement.dir = initialLang === "ar" ? "rtl" : "ltr";
}

export default i18n;
