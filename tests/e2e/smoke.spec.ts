import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("public landing renders", async ({ page }) => {
    await page.goto("/decouvrir");
    await expect(page).toHaveTitle(/Nidit/i);
    // The body should have rendered something
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(20);
  });

  test("login page reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 15_000 });
  });

  test("signup page reachable", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("textbox", { name: /email/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});
