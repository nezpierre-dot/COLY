import { Helmet } from "react-helmet-async";

interface HreflangAlternate {
  hreflang: string;
  href: string;
}

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noIndex?: boolean;
  /**
   * Locale alternates for the same content.
   * If omitted but `canonical` is set, defaults to fr / en / ar (Nidit's served locales)
   * + x-default pointing to the canonical URL.
   */
  hreflang?: HreflangAlternate[];
  /** Disable the auto hreflang fallback (e.g. for legal/private pages). */
  noHreflang?: boolean;
}

const SITE_URL = "https://nidit.fr";
const DEFAULT_LOCALES = ["fr", "en", "ar"];

function absolutize(path: string): string {
  if (!path) return SITE_URL;
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * SEO meta tags component using react-helmet-async.
 * Googlebot executes JS so client-rendered tags are indexed.
 * For social crawlers (FB, Twitter...), use the og-meta edge function URL when sharing.
 */
export default function Seo({
  title,
  description,
  canonical,
  image,
  type = "website",
  jsonLd,
  noIndex,
  hreflang,
  noHreflang,
}: SeoProps) {
  const fullCanonical = canonical ? absolutize(canonical) : undefined;
  const ogImage = image || `${SITE_URL}/icons/pwa-512x512.png`;

  // Auto-build hreflang alternates if not explicitly provided.
  const alternates: HreflangAlternate[] = (() => {
    if (noHreflang || !fullCanonical) return [];
    if (hreflang && hreflang.length) return hreflang;
    // Nidit currently serves a single canonical URL per page across locales (client-side i18n).
    // We still emit hreflang so Google understands the page targets multiple regions.
    return [
      ...DEFAULT_LOCALES.map((l) => ({ hreflang: l, href: fullCanonical })),
      { hreflang: "x-default", href: fullCanonical },
    ];
  })();

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}
      {alternates.map((a) => (
        <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={a.href} />
      ))}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Nidit" />
      <meta property="og:locale" content="fr_FR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
