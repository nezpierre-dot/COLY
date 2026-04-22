import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
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

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => false };
});

const STORAGE_KEY = "preferred-language";

const renderInLocale = (locale: "fr" | "en") => {
  localStorage.setItem(STORAGE_KEY, locale);
  localStorage.setItem("onboarding-done", "1");
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
};

describe("Welcome page – i18n (FR / EN)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.clear();
    cleanup();
  });

  describe("French", () => {
    it("renders the FR tagline in the H1", () => {
      renderInLocale("fr");
      const heading = screen.getByRole("heading", { level: 1 });
      const text = heading.textContent ?? "";
      expect(text).toMatch(/Partagez le trajet/i);
      expect(text).toMatch(/facilitez vos/i);
      expect(text).toMatch(/échanges/i);
    });

    it("renders FR CTA labels (signup + login link)", () => {
      renderInLocale("fr");
      const signup = screen.getByTestId("cta-signup");
      expect(signup).toHaveTextContent(/Inscription/i);
      expect(signup).toHaveAccessibleName(/Inscription.*créer un compte/i);

      const login = screen.getByTestId("cta-login");
      expect(login).toHaveTextContent(/J'ai déjà un compte/i);
    });

    it("renders the 3 benefit cards in FR", () => {
      renderInLocale("fr");
      const list = screen.getByTestId("benefits-list");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(within(list).getByText("Voyagez malin")).toBeInTheDocument();
      expect(within(list).getByText("Recevez vite")).toBeInTheDocument();
      expect(within(list).getByText("Gagnez en route")).toBeInTheDocument();
    });
  });

  describe("English", () => {
    it("renders the EN tagline in the H1", () => {
      renderInLocale("en");
      const heading = screen.getByRole("heading", { level: 1 });
      const text = heading.textContent ?? "";
      expect(text).toMatch(/Share the journey/i);
      expect(text).toMatch(/simplify your/i);
      expect(text).toMatch(/exchanges/i);
    });

    it("renders EN CTA labels (signup + login link)", () => {
      renderInLocale("en");
      const signup = screen.getByTestId("cta-signup");
      expect(signup).toHaveTextContent(/Sign up/i);

      const login = screen.getByTestId("cta-login");
      expect(login).toHaveTextContent(/I already have an account/i);
    });

    it("still renders the 3 benefit cards (copy currently FR-only by design)", () => {
      // The 3 benefit labels are intentionally hard-coded in FR for now.
      // This test guards the COUNT/structure, not the literal copy, so it
      // passes today and will keep passing once the copy is translated.
      renderInLocale("en");
      const list = screen.getByTestId("benefits-list");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      // Each card must contain non-empty text content
      items.forEach((item) => {
        expect((item.textContent ?? "").trim().length).toBeGreaterThan(0);
      });
    });
  });
});
