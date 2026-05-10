/**
 * seo.ts — Helpers JSON-LD réutilisables pour Nidit.
 *
 * Génère des objets compatibles schema.org à injecter dans <Helmet> via
 * <script type="application/ld+json">{JSON.stringify(makeXxxJsonLd(...))}</script>.
 *
 * Pourquoi : Google + assistants IA (ChatGPT, Perplexity, Gemini) lisent ces
 * structures pour comprendre tes pages. Mieux structuré = mieux indexé =
 * mieux cité = plus de trafic organique.
 */

const SITE_URL = "https://nidit.fr";
const ORG_NAME = "Nidit";

export interface OrgInfo {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

export function makeOrganizationJsonLd(info: Partial<OrgInfo> = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: info.name ?? ORG_NAME,
    url: info.url ?? SITE_URL,
    logo: info.logo ?? `${SITE_URL}/logo.png`,
    sameAs: info.sameAs ?? [],
  };
}

export function makeServiceJsonLd(opts: {
  name?: string;
  description: string;
  ratingValue?: string;
  reviewCount?: string;
  lowPrice?: string;
  highPrice?: string;
} = { description: "" }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name ?? ORG_NAME,
    description: opts.description,
    provider: { "@type": "Organization", name: ORG_NAME, url: SITE_URL },
    areaServed: { "@type": "Country", name: "Worldwide" },
    ...(opts.lowPrice || opts.highPrice ? {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: opts.lowPrice ?? "5",
        highPrice: opts.highPrice ?? "150",
      },
    } : {}),
    ...(opts.ratingValue ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: opts.ratingValue,
        reviewCount: opts.reviewCount ?? "100",
      },
    } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function makeBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function makeFAQJsonLd(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export interface CityRoute {
  from: string;
  to: string;
  fromCountry?: string;
  toCountry?: string;
  averagePriceEUR?: number;
  averageDurationHours?: number;
}

/** Génère le JSON-LD d'une page de trajet ville-à-ville (SEO programmatique). */
export function makeRouteJsonLd(route: CityRoute) {
  const title = `Envoyer un colis ${route.from} → ${route.to}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description: `Envoyez un colis de ${route.from} à ${route.to} via un voyageur vérifié Nidit. ${route.averagePriceEUR ? `À partir de ${route.averagePriceEUR} €.` : ""} ${route.averageDurationHours ? `Délai moyen : ${route.averageDurationHours} h.` : ""}`,
    provider: { "@type": "Organization", name: ORG_NAME, url: SITE_URL },
    areaServed: [
      { "@type": "City", name: route.from, ...(route.fromCountry ? { containedInPlace: { "@type": "Country", name: route.fromCountry } } : {}) },
      { "@type": "City", name: route.to,   ...(route.toCountry   ? { containedInPlace: { "@type": "Country", name: route.toCountry   } } : {}) },
    ],
    ...(route.averagePriceEUR ? {
      offers: { "@type": "Offer", priceCurrency: "EUR", price: String(route.averagePriceEUR) },
    } : {}),
  };
}

/** Helper pour générer le tag <script> JSON-LD à injecter dans <Helmet>. */
export function jsonLdScript(payload: object): string {
  return JSON.stringify(payload);
}

/** Slugify simple (FR-aware) — convertit "Paris-Marseille" depuis from/to. */
export function slugifyRoute(from: string, to: string): string {
  const norm = (s: string) =>
    s.toLowerCase()
     .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z0-9]+/g, "-")
     .replace(/^-|-$/g, "");
  return `${norm(from)}-${norm(to)}`;
}
