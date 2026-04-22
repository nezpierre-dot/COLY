/**
 * Verifies that completing the OnboardingFlow returns focus to the
 * Welcome page's primary CTA — important for keyboard and screen-reader
 * users (WCAG 2.4.3 Focus Order).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Welcome from "./Welcome";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => true };
});

// Provide `requestAnimationFrame` for jsdom (Welcome uses rAF before focusing)
beforeEach(() => {
  if (!("requestAnimationFrame" in window)) {
    (window as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number })
      .requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0) as unknown as number;
  }
});

describe("Onboarding completion → focus return", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the onboarding dialog with proper ARIA roles", () => {
    // Onboarding-done flag NOT set → onboarding shows
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );

    const dialog = screen.getByTestId("onboarding-dialog");
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    // Tablist for slide indicators
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(3);
  });

  it("returns focus to the signup CTA after onboarding completes", async () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );

    // Walk through the 3 onboarding slides
    const next = screen.getByTestId("onboarding-next");
    act(() => next.click());
    const next2 = screen.getByTestId("onboarding-next");
    act(() => next2.click());

    // Last slide → "Create account" closes onboarding (path "/signup" navigates)
    // We use the secondary "I already have an account" → finish("/login") which
    // also closes the dialog and triggers focus return; the navigate call is
    // mocked. We pick "create account" to validate the primary path.
    const createAccountBtn = screen.getByTestId("onboarding-create-account");
    act(() => createAccountBtn.click());

    // Onboarding dismissed → Welcome page is now in the DOM and the CTA
    // should receive focus on the next animation frame.
    const cta = await screen.findByTestId("cta-signup");
    await waitFor(() => {
      expect(document.activeElement).toBe(cta);
    });
  });

  it("returns focus to the signup CTA when user clicks 'Skip'", async () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );

    const skip = screen.getByTestId("onboarding-skip");
    act(() => skip.click());

    const cta = await screen.findByTestId("cta-signup");
    await waitFor(() => {
      expect(document.activeElement).toBe(cta);
    });
  });
});
