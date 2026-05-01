/**
 * E2E — Address autocomplete in the Send wizard.
 *
 * Covers:
 *  - Mapbox geocoding suggestions appear as you type.
 *  - Keyboard navigation (ArrowDown / ArrowUp / Enter / Escape) drives the
 *    listbox and selects a suggestion.
 *  - The "Use current location" button reverse-geocodes a granted position
 *    and pre-fills the city + country fields.
 *
 * Strategy: we intercept Mapbox's `/geocoding/v5/mapbox.places/...` endpoint
 * with `page.route(...)` so the test is hermetic and offline-friendly.
 *
 * The wizard route is `/send` (auth-protected). The test attempts to navigate
 * there directly; if the app redirects to `/login`, the test is skipped — the
 * E2E auth bootstrap is beyond the scope of this spec.
 */
import { test, expect, type Route } from "@playwright/test";

const FORWARD_RESPONSE = {
  features: [
    {
      id: "place.paris",
      text: "Paris",
      center: [2.35, 48.85],
      context: [
        { id: "region.idf", text: "Île-de-France" },
        { id: "country.fr", text: "France", short_code: "fr" },
      ],
    },
    {
      id: "place.parma",
      text: "Parma",
      center: [10.32, 44.8],
      context: [
        { id: "region.er", text: "Emilia-Romagna" },
        { id: "country.it", text: "Italy", short_code: "it" },
      ],
    },
  ],
};

const REVERSE_RESPONSE = {
  features: [
    {
      id: "place.lyon",
      text: "Lyon",
      center: [4.83, 45.76],
      context: [
        { id: "region.aura", text: "Auvergne-Rhône-Alpes" },
        { id: "country.fr", text: "France", short_code: "fr" },
      ],
    },
  ],
};

test.describe("Send wizard — address autocompletion (E2E)", () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation up-front + freeze position to Lyon-ish coords.
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 45.76, longitude: 4.83 });

    // Stub Mapbox: forward returns Paris/Parma; reverse (numeric coords path)
    // returns Lyon. Mapbox URL pattern: /geocoding/v5/mapbox.places/<query>.json
    await page.route(/\/geocoding\/v5\/mapbox\.places\/[^/]+\.json/, (route: Route) => {
      const url = route.request().url();
      // Reverse geocoding URL contains "<lng>,<lat>" while forward contains a name.
      const isReverse = /\/-?\d+(\.\d+)?,-?\d+(\.\d+)?\.json/.test(url);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isReverse ? REVERSE_RESPONSE : FORWARD_RESPONSE),
      });
    });
  });

  async function gotoStep2(page: import("@playwright/test").Page) {
    await page.goto("/send");
    // If protected route bounces to login, skip — auth bootstrap not in scope.
    await page.waitForLoadState("domcontentloaded");
    if (/\/login(\?|$)/.test(page.url())) test.skip(true, "Auth required for /send");

    // Step 1: pick "Colis" type, then click Suivant.
    const parcelOption = page.getByRole("radio").first();
    await expect(parcelOption).toBeVisible({ timeout: 15_000 });
    await parcelOption.click();
    await page.getByRole("button", { name: /Suivant|Next/i }).click();

    // Step 2: combobox should be focused/visible.
    await expect(page.getByRole("combobox").first()).toBeVisible();
  }

  test("typing shows Mapbox suggestions in a listbox", async ({ page }) => {
    await gotoStep2(page);
    const combo = page.getByRole("combobox").first();
    await combo.fill("par");
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible({ timeout: 5000 });
    await expect(list.getByText("Paris")).toBeVisible();
    await expect(list.getByText("Parma")).toBeVisible();
    // ARIA contract
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await expect(combo).toHaveAttribute("aria-autocomplete", "list");
  });

  test("ArrowDown / ArrowUp / Enter selects a suggestion", async ({ page }) => {
    await gotoStep2(page);
    const combo = page.getByRole("combobox").first();
    await combo.fill("par");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 5000 });

    // Active descendant defaults to first option (-opt-0).
    await expect(combo).toHaveAttribute("aria-activedescendant", /-opt-0$/);
    await combo.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-activedescendant", /-opt-1$/);
    await combo.press("ArrowUp");
    await expect(combo).toHaveAttribute("aria-activedescendant", /-opt-0$/);
    await combo.press("Enter");

    // Listbox closed and city filled.
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(combo).toHaveValue("Paris");
  });

  test("Escape closes the listbox without selecting", async ({ page }) => {
    await gotoStep2(page);
    const combo = page.getByRole("combobox").first();
    await combo.fill("par");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 5000 });
    await combo.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    // Value unchanged
    await expect(combo).toHaveValue("par");
  });

  test("'Use current location' fills city + country via reverse geocoding", async ({
    page,
  }) => {
    await gotoStep2(page);
    const useLocBtn = page.getByRole("button", {
      name: /position actuelle|current location/i,
    });
    await expect(useLocBtn).toBeVisible();
    await useLocBtn.click();

    const combo = page.getByRole("combobox").first();
    await expect(combo).toHaveValue("Lyon", { timeout: 5000 });
    // Country input is the 2nd field in the step.
    await expect(page.locator("#wiz-country")).toHaveValue("France");
  });
});
