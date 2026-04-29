/**
 * i18next configuration & runtime tests.
 *
 * Verifies:
 *  - i18next initializes successfully with the merged dictionaries.
 *  - Lookup falls back to FR when a key is missing in the active locale.
 *  - changeLanguage() persists to localStorage and updates resolvedLanguage.
 *  - <html lang> and dir are kept in sync (RTL for Arabic).
 *  - The legacy `getT/translate` helpers still resolve the same strings
 *    (backwards-compat with code that imports them directly).
 */
import { describe, it, expect, beforeAll } from "vitest";
import i18n from "@/i18n/config";
import { getT, translate } from "@/lib/i18n";

beforeAll(async () => {
  // Ensure i18next is initialized before tests run
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
});

describe("i18next runtime", () => {
  it("is initialized with the expected supported languages", () => {
    expect(i18n.isInitialized).toBe(true);
    const supported = i18n.options.supportedLngs as readonly string[];
    expect(supported).toEqual(
      expect.arrayContaining(["fr", "en", "es", "de", "pt", "it", "ar"]),
    );
  });

  it("resolves a known key in French", async () => {
    await i18n.changeLanguage("fr");
    expect(i18n.t("common.back")).toBe("Retour");
    expect(i18n.t("nav.home")).toBe("Accueil");
  });

  it("resolves the same key in English after switching", async () => {
    await i18n.changeLanguage("en");
    const back = i18n.t("common.back");
    expect(back).toBeTruthy();
    expect(back).not.toBe("common.back"); // not the raw key
    // English should differ from the French value
    expect(back).not.toBe("Retour");
  });

  it("resolves a known key in Spanish after switching", async () => {
    await i18n.changeLanguage("es");
    const back = i18n.t("common.back");
    expect(back).toBeTruthy();
    expect(back).not.toBe("common.back");
  });

  it("falls back to French when a key is missing in the active locale", async () => {
    // "ar" only contains a small subset → most keys must fall back to FR.
    await i18n.changeLanguage("ar");
    // "dashboard.recentActivity" is not in ar dict but exists in fr.
    const value = i18n.t("dashboard.recentActivity");
    expect(value).toBe("Activité récente");
  });

  it("returns the raw key only when no language has it", async () => {
    await i18n.changeLanguage("fr");
    const value = i18n.t("__definitely__missing__key__");
    expect(value).toBe("__definitely__missing__key__");
  });

  it("persists language choice in localStorage", async () => {
    await i18n.changeLanguage("es");
    expect(localStorage.getItem("preferred-language")).toBe("es");
  });

  it("updates <html lang> and dir on language change (RTL for Arabic)", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    await i18n.changeLanguage("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("legacy helpers backwards-compat", () => {
  it("getT(locale) returns a function resolving the same value as direct dict lookup", () => {
    const tFr = getT("fr");
    const tEn = getT("en");
    expect(tFr("common.back")).toBe("Retour");
    expect(tEn("common.back")).not.toBe("Retour");
    expect(tEn("common.back")).toBeTruthy();
  });

  it("translate() respects the explicit locale arg", () => {
    expect(translate("nav.home", "fr")).toBe("Accueil");
    expect(translate("nav.home", "en")).toBeTruthy();
    expect(translate("nav.home", "en")).not.toBe("Accueil");
  });

  it("translate() falls back to FR for partial locales", () => {
    // dashboard.recentActivity only exists in FR — must fall back even when ar requested
    expect(translate("dashboard.recentActivity", "ar")).toBe("Activité récente");
  });
});
