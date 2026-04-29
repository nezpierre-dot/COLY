# E2E Tests (Playwright)

Critical end-to-end flow: **signup → create shipment → traveler match → delivery confirmation**.

## Run locally

```bash
# 1. Start the dev server in one terminal
bun run dev

# 2. In another terminal, install Playwright browsers (first run only)
bunx playwright install chromium

# 3. Run the suite
bunx playwright test

# Run a single test interactively (UI mode)
bunx playwright test --ui

# Run against the live site instead of localhost
BASE_URL=https://nidit.fr bunx playwright test
```

## Test data

The full flow test (`shipment-flow.spec.ts`) uses two ephemeral test accounts created on
the fly with timestamped emails (e.g. `e2e-demandeur-1730000000000@nidit.test`).

**Important**: Auto-confirm email signups must be ON in the test environment, otherwise
the signup step blocks on email verification. In production, that toggle should remain OFF.

If your project requires email confirmation, set `E2E_DEMANDEUR_EMAIL`,
`E2E_DEMANDEUR_PASSWORD`, `E2E_VOYAGEUR_EMAIL`, `E2E_VOYAGEUR_PASSWORD` env vars
to use pre-existing confirmed test accounts. The signup step will be skipped.

## Files

- `playwright.config.ts` — Playwright configuration
- `tests/e2e/shipment-flow.spec.ts` — Full flow: signup → create shipment → match → deliver
- `tests/e2e/smoke.spec.ts` — Quick health check (landing renders, login form visible)
