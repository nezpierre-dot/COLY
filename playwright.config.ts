import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — E2E tests for Nidit.
 *
 * BASE_URL: by default targets the local dev server (Vite on 8080).
 * Override with `BASE_URL=https://nidit.fr npx playwright test` to run against staging/prod.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "fr-FR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // No webServer block: run `bun run dev` separately or rely on the Lovable preview.
});
