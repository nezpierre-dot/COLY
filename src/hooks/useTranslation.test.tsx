/**
 * Hook-level test: ensure the React useTranslation hook re-renders
 * components when the language changes — the contract every screen
 * relies on.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import i18n from "@/i18n/config";
import { useTranslation } from "@/hooks/useTranslation";

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
});

const Probe = () => {
  const { t, language } = useTranslation();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="back">{t("common.back")}</span>
      <span data-testid="home">{t("nav.home")}</span>
    </div>
  );
};

describe("useTranslation hook", () => {
  it("renders the current language strings and updates on changeLanguage", async () => {
    await act(async () => {
      await i18n.changeLanguage("fr");
    });
    render(<Probe />);
    expect(screen.getByTestId("lang").textContent).toBe("fr");
    expect(screen.getByTestId("back").textContent).toBe("Retour");
    expect(screen.getByTestId("home").textContent).toBe("Accueil");

    // Switch to EN — the component must re-render with the new strings
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("back").textContent).not.toBe("Retour");
    expect(screen.getByTestId("home").textContent).not.toBe("Accueil");

    // Switch to ES
    await act(async () => {
      await i18n.changeLanguage("es");
    });
    expect(screen.getByTestId("lang").textContent).toBe("es");
    expect(screen.getByTestId("back").textContent).toBeTruthy();
    expect(screen.getByTestId("home").textContent).toBeTruthy();
  });

  it("does not render raw key fallbacks for required UI strings", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    render(<Probe />);
    expect(screen.getByTestId("back").textContent).not.toMatch(/^common\./);
    expect(screen.getByTestId("home").textContent).not.toMatch(/^nav\./);
  });
});
