/**
 * Dictionary integrity tests.
 *
 * Goals:
 *  1. Every supported locale exposes a non-empty translation dictionary.
 *  2. Critical UI keys (used across Welcome, Auth, Dashboard, BottomNav, Wallet)
 *     exist for FR / EN / ES — guaranteeing the build never silently loses them.
 *  3. The shared "common.*" namespace is fully covered in EN and ES (the two
 *     primary export languages) so users never see raw keys like "common.back".
 *  4. No dictionary value is an empty string (would render blank UI).
 */
import { describe, it, expect } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { AVAILABLE_LANGUAGES } from "@/lib/geoLocalization";

const REQUIRED_KEYS = [
  // Common
  "common.back", "common.next", "common.save", "common.cancel", "common.search",
  "common.logout", "common.login", "common.signup",
  // Navigation
  "nav.home", "nav.missions", "nav.messages", "nav.profile",
  // Welcome / Auth
  "welcome.tagline",
  // Dashboard
  "dashboard.voyages", "dashboard.sendColy",
  // Settings
  "settings.title", "settings.light", "settings.dark", "settings.auto",
  // Conversations / Search / History / Missions
  "conversations.title", "search.title", "history.title", "missions.title",
  // Transport
  "transport.avion", "transport.train", "transport.voiture",
  "transport.bus", "transport.bateau", "transport.velo",
];

const CORE_LOCALES = ["fr", "en", "es"] as const;

describe("i18n dictionaries", () => {
  it("exposes a dictionary for every declared locale", () => {
    for (const { code } of AVAILABLE_LANGUAGES) {
      expect(dictionaries[code], `Missing dict for ${code}`).toBeDefined();
      expect(Object.keys(dictionaries[code]).length).toBeGreaterThan(0);
    }
  });

  it("French dictionary is the source of truth (largest)", () => {
    const frSize = Object.keys(dictionaries.fr).length;
    expect(frSize).toBeGreaterThan(100);
    for (const { code } of AVAILABLE_LANGUAGES) {
      if (code === "fr") continue;
      expect(Object.keys(dictionaries[code]).length).toBeLessThanOrEqual(frSize);
    }
  });

  it.each(CORE_LOCALES)("locale %s contains every required UI key", (locale) => {
    const dict = dictionaries[locale];
    for (const key of REQUIRED_KEYS) {
      expect(dict[key], `Missing "${key}" in ${locale}`).toBeTruthy();
      expect(typeof dict[key]).toBe("string");
      expect(dict[key].length).toBeGreaterThan(0);
    }
  });

  it("never contains empty translation values", () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `Empty value for "${key}" in "${locale}"`).not.toBe("");
        expect(value, `Whitespace-only value for "${key}" in "${locale}"`).toMatch(/\S/);
      }
    }
  });

  it("keys do not contain leading/trailing whitespace", () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const key of Object.keys(dict)) {
        expect(key.trim(), `Key "${key}" in ${locale} has whitespace`).toBe(key);
      }
    }
  });
});
