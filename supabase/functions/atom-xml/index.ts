// @ts-nocheck
// Atom 1.0 feed for the Nidit blog.
//   GET /atom-xml         → /blog feed (all posts)
// Public URLs (via hosting/proxy rewrite):
//   https://nidit.fr/atom.xml
//   https://nidit.fr/blog/atom.xml

const SITE_URL = "https://nidit.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep in sync with src/lib/blogPosts.ts and rss-xml/index.ts.
const BLOG_POSTS: Array<{
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
}> = [
  { slug: "envoyer-colis-maroc-pas-cher", title: "Comment envoyer un colis au Maroc pas cher en 2025", description: "Guide complet pour envoyer un colis au Maroc moins cher : tarifs, délais, douane, alternative collaborative Nidit.", publishedAt: "2026-05-05", category: "guide" },
  { slug: "comparatif-envoi-colis-international-2025", title: "Comparatif envoi colis international 2025 : Nidit, La Poste, DHL, Chronopost", description: "Comparatif 2025 des solutions pour envoyer un colis à l'international : tarifs, délais, suivi, douane.", publishedAt: "2026-05-05", category: "comparatif" },
  { slug: "envoyer-colis-senegal-dakar", title: "Envoyer un colis au Sénégal (Dakar) : guide pratique 2025", description: "Comment envoyer un colis au Sénégal pas cher : tarifs Paris → Dakar, douane sénégalaise, délais, voyageurs Nidit.", publishedAt: "2026-05-05", category: "destination" },
  { slug: "astuces-emballage-colis-international", title: "10 astuces pour bien emballer un colis avant un envoi international", description: "Comment emballer ton colis pour un envoi international : matériel, protection, étiquetage, douane.", publishedAt: "2026-05-05", category: "astuces" },
  { slug: "envoyer-colis-algerie", title: "Envoyer un colis en Algérie depuis la France : tarifs et conseils 2025", description: "Guide complet pour envoyer un colis en Algérie (Alger, Oran, Constantine) : Colissimo, DHL, voyageurs Nidit.", publishedAt: "2026-05-05", category: "destination" },
];

function escapeXml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function isoDate(d: string) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

function buildEntry(p: (typeof BLOG_POSTS)[number]): string {
  const url = `${SITE_URL}/blog/${p.slug}`;
  const updated = isoDate(p.updatedAt || p.publishedAt);
  return [
    "<entry>",
    `<title>${escapeXml(p.title)}</title>`,
    `<link href="${escapeXml(url)}" />`,
    `<id>${escapeXml(url)}</id>`,
    `<updated>${updated}</updated>`,
    `<published>${isoDate(p.publishedAt)}</published>`,
    `<category term="${escapeXml(p.category)}" />`,
    `<summary>${escapeXml(p.description)}</summary>`,
    "</entry>",
  ].join("");
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sorted = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  const updated = isoDate(sorted[0]?.updatedAt || sorted[0]?.publishedAt || new Date().toISOString());
  const entries = sorted.map(buildEntry).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr-FR">
<title>Blog Nidit — Envoi de colis international</title>
<subtitle>Guides, comparatifs et astuces pour envoyer un colis à l'international avec Nidit.</subtitle>
<link href="${SITE_URL}/blog" />
<link rel="self" type="application/atom+xml" href="${SITE_URL}/atom.xml" />
<id>${SITE_URL}/blog</id>
<updated>${updated}</updated>
<author><name>Nidit</name></author>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
    },
  });
});
