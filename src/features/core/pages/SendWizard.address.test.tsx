/**
 * Component tests for the address-step UI inside SendWizard:
 *  - PlaceAutocompleteInput: debounced suggestions, ↑/↓/Enter/Escape navigation,
 *    ARIA combobox attributes, normalization on blur.
 *  - CityCountryStep: "Use current location" button (success / denied / unavailable).
 *
 * We mock `@/lib/placeSearch` so no network is hit, and `sonner` so toasts can be
 * asserted without rendering the toaster.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n/config";

// Mock the placeSearch module BEFORE importing the component under test.
vi.mock("@/lib/placeSearch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/placeSearch")>(
    "@/lib/placeSearch",
  );
  return {
    ...actual,
    searchPlaces: vi.fn(),
    reverseGeocode: vi.fn(),
    requestUserLocation: vi.fn(),
  };
});

// Toast mock (sonner)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Analytics + haptics: silence
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/haptics", () => ({ hapticLight: vi.fn() }));

// BottomNav has heavy dependencies (router/auth) — not needed here, and we
// don't render SendWizard directly. We import only the exported subcomponents.
import {
  PlaceAutocompleteInput,
  CityCountryStep,
} from "@/features/core/pages/SendWizard";
import * as placeSearchModule from "@/lib/placeSearch";
import { toast } from "sonner";

const SUGGESTIONS = [
  { id: "1", city: "Paris", country: "France", region: "IDF", label: "Paris, IDF, France" },
  { id: "2", city: "Lyon", country: "France", region: "Rhône", label: "Lyon, Rhône, France" },
  { id: "3", city: "Marseille", country: "France", region: "PACA", label: "Marseille, PACA, France" },
];

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  }
  await i18n.changeLanguage("fr");
});

beforeEach(() => {
  vi.clearAllMocks();
  (placeSearchModule.searchPlaces as any).mockResolvedValue(SUGGESTIONS);
});

// ---- Test harness for the controlled autocomplete input -------------------
function Harness(initial = "") {
  return function Wrapped() {
    const [v, setV] = (require("react") as typeof import("react")).useState(initial);
    return (
      <PlaceAutocompleteInput
        id="t"
        value={v}
        onChange={setV}
        onPick={(s) => setV(s.city)}
        placeholder="Ville"
        hasError={false}
      />
    );
  };
}

describe("PlaceAutocompleteInput — autocompletion", () => {
  it("does not query for queries shorter than 2 chars", async () => {
    const Wrapped = Harness();
    render(<Wrapped />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "p");
    // wait past the 220ms debounce
    await new Promise((r) => setTimeout(r, 280));
    expect(placeSearchModule.searchPlaces).not.toHaveBeenCalled();
  });

  it("debounces and renders suggestions in a listbox", async () => {
    const Wrapped = Harness();
    render(<Wrapped />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "par");
    await waitFor(
      () => expect(placeSearchModule.searchPlaces).toHaveBeenCalled(),
      { timeout: 1000 },
    );
    const list = await screen.findByRole("listbox");
    expect(list).toBeInTheDocument();
    expect(await screen.findByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
  });

  it("sets aria-expanded and aria-controls on the combobox", async () => {
    const Wrapped = Harness();
    render(<Wrapped />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    await userEvent.type(input, "par");
    await waitFor(() =>
      expect(input.getAttribute("aria-expanded")).toBe("true"),
    );
    expect(input.getAttribute("aria-controls")).toBe("t-listbox");
  });
});

describe("PlaceAutocompleteInput — keyboard navigation", () => {
  async function setupOpen() {
    const Wrapped = Harness();
    render(<Wrapped />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await userEvent.type(input, "par");
    // Wait for the search to resolve and Paris to appear (active=0 is set then)
    await screen.findByText("Paris", {}, { timeout: 2000 });
    await waitFor(() =>
      expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-0"),
    );
    return input;
  }

  it("ArrowDown moves the active descendant", async () => {
    const input = await setupOpen();
    // First suggestion is auto-active (active=0)
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-0");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-1");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-2");
    // Stays on last
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-2");
  });

  it("ArrowUp moves up and clamps at 0", async () => {
    const input = await setupOpen();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-2");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-1");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe("t-opt-0");
  });

  it("Enter selects the active option and closes the listbox", async () => {
    const input = await setupOpen();
    fireEvent.keyDown(input, { key: "ArrowDown" }); // -> Lyon (idx 1)
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect((input as HTMLInputElement).value).toBe("Lyon");
  });

  it("Escape closes the listbox without selecting", async () => {
    const input = await setupOpen();
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("ArrowDown on a closed listbox re-opens it", async () => {
    const input = await setupOpen();
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
  });
});

// ---- "Use current location" button ----------------------------------------
function renderCityCountry() {
  let countryV = "";
  let cityV = "";
  const setCountry = vi.fn((v: string) => (countryV = v));
  const setCity = vi.fn((v: string) => (cityV = v));
  const utils = render(
    <CityCountryStep
      icon={null}
      countryLabel="Pays"
      cityLabel="Ville"
      countryPh="Pays…"
      cityPh="Ville…"
      country={countryV}
      city={cityV}
      setCountry={setCountry}
      setCity={setCity}
      countryErr={null}
      cityErr={null}
    />,
  );
  return { ...utils, setCountry, setCity };
}

describe("CityCountryStep — Use current location button", () => {
  it("fills city + country on success", async () => {
    (placeSearchModule.requestUserLocation as any).mockResolvedValueOnce({
      coords: { latitude: 48.85, longitude: 2.35 },
    });
    (placeSearchModule.reverseGeocode as any).mockResolvedValueOnce({
      id: "x",
      city: "Paris",
      country: "France",
      label: "Paris, France",
    });
    const { setCity, setCountry } = renderCityCountry();
    const btn = screen.getByRole("button", { name: /position actuelle|utiliser/i });
    await userEvent.click(btn);
    await waitFor(() => expect(setCity).toHaveBeenCalledWith("Paris"));
    expect(setCountry).toHaveBeenCalledWith("France");
    expect(toast.success).toHaveBeenCalled();
  });

  it("toasts 'denied' when permission was refused (code === 1)", async () => {
    (placeSearchModule.requestUserLocation as any).mockRejectedValueOnce({ code: 1 });
    renderCityCountry();
    const btn = screen.getByRole("button", { name: /position actuelle|utiliser/i });
    await userEvent.click(btn);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("toasts 'unavailable' when the geolocation API is missing", async () => {
    (placeSearchModule.requestUserLocation as any).mockRejectedValueOnce(
      new Error("geolocation_unavailable"),
    );
    renderCityCountry();
    const btn = screen.getByRole("button", { name: /position actuelle|utiliser/i });
    await userEvent.click(btn);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("toasts a generic error when reverseGeocode returns null", async () => {
    (placeSearchModule.requestUserLocation as any).mockResolvedValueOnce({
      coords: { latitude: 0, longitude: 0 },
    });
    (placeSearchModule.reverseGeocode as any).mockResolvedValueOnce(null);
    renderCityCountry();
    const btn = screen.getByRole("button", { name: /position actuelle|utiliser/i });
    await userEvent.click(btn);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("disables the button while geolocating (loading state)", async () => {
    let resolve!: (v: any) => void;
    (placeSearchModule.requestUserLocation as any).mockReturnValueOnce(
      new Promise((r) => (resolve = r)),
    );
    renderCityCountry();
    const btn = screen.getByRole("button", { name: /position actuelle|utiliser/i });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
    await act(async () => {
      resolve({ coords: { latitude: 0, longitude: 0 } });
      (placeSearchModule.reverseGeocode as any).mockResolvedValueOnce(null);
    });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});
