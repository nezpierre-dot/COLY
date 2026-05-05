import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import Seo from "@/components/Seo";

function renderSeo(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

function getJsonLd(): Array<Record<string, unknown>> {
  const scripts = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'));
  return scripts.flatMap((s) => {
    const parsed = JSON.parse(s.textContent || "null");
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

describe("Seo component — JSON-LD & SEO tags", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects all required Schema.org types for trip pages", async () => {
    const jsonLd = [
      { "@context": "https://schema.org", "@type": "TravelAction", name: "Paris → Dakar" },
      { "@context": "https://schema.org", "@type": "Service", serviceType: "Transport de colis entre particuliers" },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "Accueil", item: "https://nidit.fr/" }],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A" } }],
      },
    ];

    renderSeo(
      <Seo
        title="Envoyer un colis Paris → Dakar"
        description="Trajet avion Paris → Dakar"
        canonical="/trajet/abc"
        jsonLd={jsonLd}
      />,
    );

    await waitFor(() => {
      const items = getJsonLd();
      const types = items.map((i) => i["@type"]);
      expect(types).toContain("TravelAction");
      expect(types).toContain("Service");
      expect(types).toContain("BreadcrumbList");
      expect(types).toContain("FAQPage");
    });

    // Each block has a valid @context
    for (const item of getJsonLd()) {
      expect(item["@context"]).toBe("https://schema.org");
      expect(typeof item["@type"]).toBe("string");
    }
  });

  it("emits absolute canonical and hreflang alternates by default", async () => {
    renderSeo(
      <Seo title="t" description="d" canonical="/trajet/xyz" />,
    );

    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute("href")).toBe("https://nidit.fr/trajet/xyz");
    });

    const alternates = Array.from(document.head.querySelectorAll('link[rel="alternate"]'));
    const hreflangs = alternates.map((a) => a.getAttribute("hreflang"));
    expect(hreflangs).toEqual(expect.arrayContaining(["fr", "en", "ar", "x-default"]));
    for (const a of alternates) {
      expect(a.getAttribute("href")).toBe("https://nidit.fr/trajet/xyz");
    }
  });

  it("respects noHreflang flag", async () => {
    renderSeo(<Seo title="t" description="d" canonical="/legal" noHreflang />);
    await waitFor(() => {
      expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull();
    });
    expect(document.head.querySelectorAll('link[rel="alternate"]').length).toBe(0);
  });
});
