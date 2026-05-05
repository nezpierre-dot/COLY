// @ts-nocheck
// RSS 2.0 feed for the Nidit blog.
//   GET /rss-xml         → /blog feed (all posts)
// Public URLs:
//   https://nidit.fr/rss.xml        (rewritten to this function via hosting/proxy)
//   https://nidit.fr/blog/rss.xml   (alias)

const SITE_URL = "https://nidit.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep in sync with src/lib/blogPosts.ts.
// We duplicate metadata here so the edge function stays self-contained
// (no bundler, no shared imports across runtimes).
const BLOG_POSTS: Array<{
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  keywords: string[];
}> = [
  {
    slug: "envoyer-colis-maroc-pas-cher",
    title: "Comment envoyer un colis au Maroc pas cher en 2025",
    description:
      "Guide complet pour envoyer un colis au Maroc moins cher : tarifs, délais, douane, alternative collaborative Nidit (France → Casablanca, Marrakech, Rabat, Tanger).",
    publishedAt: "2026-05-05",
    category: "guide",
    keywords: ["envoi colis maroc pas cher", "envoyer colis france maroc", "tarif colis maroc"],
  },
  {
    slug: "comparatif-envoi-colis-international-2025",
    title: "Comparatif envoi colis international 2025 : Nidit, La Poste, DHL, Chronopost",
    description:
      "Comparatif 2025 des solutions pour envoyer un colis à l'international : tarifs, délais, suivi, douane.",
    publishedAt: "2026-05-05",
    category: "comparatif",
    keywords: ["comparatif envoi colis international 2025", "alternative DHL Chronopost"],
  },
  {
    slug: "envoyer-colis-senegal-dakar",
    title: "Envoyer un colis au Sénégal (Dakar) : guide pratique 2025",
    description:
      "Comment envoyer un colis au Sénégal pas cher : tarifs Paris → Dakar, douane sénégalaise, délais, voyageurs Nidit.",
    publishedAt: "2026-05-05",
    category: "destination",
    keywords: ["envoyer colis sénégal", "colis paris dakar"],
  },
  {
    slug: "astuces-emballage-colis-international",
    title: "10 astuces pour bien emballer un colis avant un envoi international",
    description:
      "Comment emballer ton colis pour un envoi international : matériel, protection, étiquetage, douane.",
    publishedAt: "2026-05-05",
    category: "astuces",
    keywords: ["emballer colis international", "comment emballer colis fragile"],
  },
  {
    slug: "envoyer-colis-algerie",
    title: "Envoyer un colis en Algérie depuis la France : tarifs et conseils 2025",
    description:
      "Guide complet pour envoyer un colis en Algérie (Alger, Oran, Constantine) : Colissimo, DHL, voyageurs Nidit.",
    publishedAt: "2026-05-05",
    category: "destination",
    keywords: ["envoyer colis algérie", "colis paris alger"],
  },
];

function escapeXml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[c]!));
}

function rfc822(dateStr: string): string {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function buildItem(p: (typeof BLOG_POSTS)[number]): string {
  const url = `${SITE_URL}/blog/${p.slug}`;
  return [
    "<item>",
    `<title>${escapeXml(p.title)}</title>`,
    `<link>${escapeXml(url)}</link>`,
    `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
    `<pubDate>${escapeXml(rfc822(p.publishedAt))}</pubDate>`,
    `<category>${escapeXml(p.category)}</category>`,
    `<description>${escapeXml(p.description)}</description>`,
    ...p.keywords.map((k) => `<category>${escapeXml(k)}</category>`),
    "</item>",
  ].join("");
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const lastBuild = new Date().toUTCString();
  const items = [...BLOG_POSTS]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map(buildItem)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Blog Nidit — Envoi de colis international</title>
<link>${SITE_URL}/blog</link>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
<description>Guides, comparatifs et astuces pour envoyer un colis à l'international avec Nidit.</description>
<language>fr-FR</language>
<lastBuildDate>${lastBuild}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
    },
  });
});
