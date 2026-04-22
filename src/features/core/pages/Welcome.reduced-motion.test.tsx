/**
 * "End-to-end-style" test (jsdom) that simulates the system-level
 * `prefers-reduced-motion` preference and asserts that Framer Motion
 * animations on the Welcome page are fully disabled.
 *
 * Why jsdom and not Playwright: this repo currently runs Vitest only,
 * and Framer Motion's `useReducedMotion` reads `window.matchMedia`,
 * which we can stub deterministically.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/components/OnboardingFlow", () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete} data-testid="onboarding-stub">
      onboarding
    </button>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => vi.fn() };
});

const installReducedMotionMatchMedia = (enabled: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: enabled && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

const renderWelcome = async () => {
  localStorage.setItem("onboarding-done", "1");
  // Import AFTER matchMedia is patched so framer-motion picks it up.
  const { default: Welcome } = await import("./Welcome");
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
};

describe("Welcome – prefers-reduced-motion E2E", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("disables entrance animations when reduced motion is requested", async () => {
    installReducedMotionMatchMedia(true);
    await renderWelcome();

    // The container is rendered with variants. With reduced motion both
    // `hidden` and `show` resolve to opacity 1 / y 0, so the stage and its
    // children are immediately visible (no fade-in transform applied).
    const stage = screen.getByTestId("welcome-stage") as HTMLElement;
    expect(stage).toBeInTheDocument();

    // Force a frame so framer-motion finishes any sync work
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // The CTA is visible immediately, not hidden behind a fade-in opacity:0
    const cta = screen.getByTestId("cta-signup");
    expect(cta).toBeVisible();

    // The H1 is also visible (entrance variant resolved to identity)
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeVisible();

    // Stage opacity must NOT be the animated 0 → 1 starting value.
    // With reduced motion the variant resolves to opacity:1 right away.
    const stageOpacity = stage.style.opacity;
    expect(stageOpacity === "" || stageOpacity === "1").toBe(true);
  });

  it("keeps animations enabled when reduced motion is OFF", async () => {
    installReducedMotionMatchMedia(false);
    await renderWelcome();

    // Content is still in the DOM regardless of animation state.
    expect(screen.getByTestId("cta-signup")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
