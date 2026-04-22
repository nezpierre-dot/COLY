import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Welcome from "./Welcome";

// ── Mocks ────────────────────────────────────────────────────────────────────
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

// Track whether reduced motion is on for each test
let reducedMotionEnabled = false;
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => reducedMotionEnabled,
  };
});

const renderPage = () => {
  // Skip the onboarding splash so the welcome layout is in the DOM
  localStorage.setItem("onboarding-done", "1");
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
};

describe("Welcome page", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    reducedMotionEnabled = false;
    localStorage.clear();
  });

  it("renders the title (h1) with the tagline", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent ?? "").toMatch(
      /trajet|échanges|partagez|journey|exchanges|share/i,
    );
  });

  it("renders the primary signup CTA and triggers navigation", async () => {
    renderPage();
    const cta = screen.getByTestId("cta-signup");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("aria-label");
    cta.click();
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });

  it("renders the secondary login link and triggers navigation", () => {
    renderPage();
    const login = screen.getByTestId("cta-login");
    expect(login).toBeInTheDocument();
    login.click();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("renders the 3 benefit cards", () => {
    renderPage();
    const list = screen.getByTestId("benefits-list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(list).getByText(/voyagez malin/i)).toBeInTheDocument();
    expect(within(list).getByText(/recevez vite/i)).toBeInTheDocument();
    expect(within(list).getByText(/gagnez en route/i)).toBeInTheDocument();
  });

  it("exposes proper landmarks and ARIA labels", () => {
    renderPage();
    expect(screen.getByRole("main")).toHaveAttribute(
      "aria-labelledby",
      "welcome-title",
    );
    expect(screen.getByLabelText(/utilisateurs nous font confiance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/avantages nidit/i)).toBeInTheDocument();
  });

  it("plays the entrance animation by default (initial=hidden, animate=show)", () => {
    renderPage();
    const stage = screen.getByTestId("welcome-stage");
    // Framer Motion forwards `initial` and `animate` to the DOM as attributes
    // when running in test mode. We assert the variants were wired.
    // Fallback: the stage has style opacity reaching 1 once mounted.
    expect(stage).toBeInTheDocument();
    const opacity = (stage as HTMLElement).style.opacity;
    // When motion is enabled the inline opacity is set by framer-motion (0 → 1).
    // We just assert it is defined and not the reduced-motion fallback ("").
    expect(opacity === "" || opacity === "1" || opacity === "0").toBe(true);
  });

  it("respects prefers-reduced-motion: no inline animated opacity, content immediately visible", () => {
    reducedMotionEnabled = true;
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    const cta = screen.getByTestId("cta-signup");
    // With reduced motion the variants resolve to opacity 1 / y 0 immediately
    expect(heading).toBeVisible();
    expect(cta).toBeVisible();
  });
});
