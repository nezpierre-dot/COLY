import { describe, it, expect } from "vitest";
import { buildTransportFaq, detectTransport } from "./transportFaq";

describe("transportFaq", () => {
  it("detects transport kind", () => {
    expect(detectTransport("Avion")).toBe("avion");
    expect(detectTransport("voiture personnelle")).toBe("voiture");
    expect(detectTransport("TGV / Train")).toBe("train");
    expect(detectTransport("Bus longue distance")).toBe("bus");
    expect(detectTransport("Ferry / Bateau")).toBe("bateau");
    expect(detectTransport("trottinette")).toBe("autre");
  });

  it("builds transport-specific FAQ for plane", () => {
    const faq = buildTransportFaq({ from: "Paris", to: "Dakar", method: "Avion" });
    expect(faq.length).toBeGreaterThanOrEqual(5);
    expect(faq.some((q) => /avion/i.test(q.q) || /avion/i.test(q.a))).toBe(true);
    expect(faq.every((q) => q.q && q.a)).toBe(true);
  });

  it("includes city pair in base questions for any mode", () => {
    const faq = buildTransportFaq({ from: "Lyon", to: "Alger", method: "Voiture" });
    expect(faq[0].q).toContain("Lyon");
    expect(faq[0].q).toContain("Alger");
  });
});
