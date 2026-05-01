/**
 * Unit tests for placeSearch helpers:
 *  - normalizePlaceText: trim + collapse + strip control chars
 *  - searchPlaces: forward geocoding shape + early-exit on short queries
 *  - reverseGeocode: coords -> { city, country }
 *  - requestUserLocation: Promise wrapper, rejects when geolocation absent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  normalizePlaceText,
  searchPlaces,
  reverseGeocode,
  requestUserLocation,
} from "./placeSearch";

describe("normalizePlaceText", () => {
  it("returns empty string for falsy input", () => {
    expect(normalizePlaceText("")).toBe("");
  });
  it("trims and collapses internal whitespace", () => {
    expect(normalizePlaceText("  Saint   Étienne  ")).toBe("Saint Étienne");
  });
  it("strips control characters", () => {
    expect(normalizePlaceText("Pa\u0001ris\u007F")).toBe("Paris");
  });
  it("preserves international characters", () => {
    expect(normalizePlaceText("São   Paulo")).toBe("São Paulo");
  });
});

const mapboxFeature = {
  id: "place.1",
  text: "Paris",
  center: [2.35, 48.85],
  context: [
    { id: "region.1", text: "Île-de-France" },
    { id: "country.1", text: "France", short_code: "fr" },
  ],
};

describe("searchPlaces", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns [] when query is shorter than 2 chars (no fetch)", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const r = await searchPlaces("a");
    expect(r).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Mapbox features to PlaceSuggestion", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mapboxFeature] }),
    });
    const r = await searchPlaces("paris");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      city: "Paris",
      country: "France",
      countryCode: "FR",
      region: "Île-de-France",
      label: "Paris, Île-de-France, France",
      center: [2.35, 48.85],
    });
  });

  it("returns [] when fetch fails", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("network"));
    const r = await searchPlaces("paris");
    expect(r).toEqual([]);
  });

  it("returns [] on non-OK response", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const r = await searchPlaces("paris");
    expect(r).toEqual([]);
  });

  it("filters out features without a `text` field", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mapboxFeature, { id: "x" }] }),
    });
    const r = await searchPlaces("paris");
    expect(r).toHaveLength(1);
  });
});

describe("reverseGeocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the first feature mapped to a suggestion", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mapboxFeature] }),
    });
    const r = await reverseGeocode(2.35, 48.85);
    expect(r?.city).toBe("Paris");
    expect(r?.country).toBe("France");
  });

  it("returns null when there is no feature", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });
    expect(await reverseGeocode(0, 0)).toBeNull();
  });

  it("returns null on fetch error", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("net"));
    expect(await reverseGeocode(0, 0)).toBeNull();
  });
});

describe("requestUserLocation", () => {
  it("rejects when navigator.geolocation is unavailable", async () => {
    const original = (navigator as any).geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    await expect(requestUserLocation()).rejects.toThrow("geolocation_unavailable");
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: original,
    });
  });

  it("resolves with the position from getCurrentPosition", async () => {
    const fakePos = { coords: { latitude: 1, longitude: 2 } } as GeolocationPosition;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) => ok(fakePos),
      },
    });
    const p = await requestUserLocation();
    expect(p.coords.latitude).toBe(1);
  });

  it("rejects with the geolocation error", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 1, message: "denied" } as GeolocationPositionError),
      },
    });
    await expect(requestUserLocation()).rejects.toMatchObject({ code: 1 });
  });
});
