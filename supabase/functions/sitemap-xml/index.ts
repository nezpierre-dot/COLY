// @ts-nocheck
// Sitemap generator for Nidit.
// Routes:
//   GET /sitemap-xml                    → sitemap index (links to sub-sitemaps)
//   GET /sitemap-xml?type=static        → static landing pages
//   GET /sitemap-xml?type=routes        → /explore/{slug} popular city pairs
//   GET /sitemap-xml?type=voyages       → /trajet/{id} active trips
//   GET /sitemap-xml?type=missions      → /needit/{id} pending missions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://nidit.fr";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FN_BASE = `${SUPABASE_URL}/functions/v1/sitemap-xml`;
const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_PATHS: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/decouvrir", priority: "0.8", changefreq: "weekly" },
  { path: "/explore", priority: "0.8", changefreq: "daily" },
  { path: "/comment-ca-marche", priority: "0.7", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/aide", priority: "0.6", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

// Blog posts (kept in sync with src/lib/blogPosts.ts).
const BLOG_POSTS: Array<{ slug: string; updatedAt: string; category: string }> = [
  { slug: "envoyer-colis-maroc-pas-cher", updatedAt: "2026-05-05", category: "guide" },
  { slug: "comparatif-envoi-colis-international-2025", updatedAt: "2026-05-05", category: "comparatif" },
  { slug: "envoyer-colis-senegal-dakar", updatedAt: "2026-05-05", category: "destination" },
  { slug: "astuces-emballage-colis-international", updatedAt: "2026-05-05", category: "astuces" },
  { slug: "envoyer-colis-algerie", updatedAt: "2026-05-05", category: "destination" },
];

const BLOG_CATEGORIES = ["guide", "comparatif", "destination", "astuces"] as const;

const POPULAR_ROUTES: Array<[string, string]> = [
  ["Paris", "Dakar"], ["Paris", "Abidjan"], ["Paris", "Alger"], ["Paris", "Casablanca"],
  ["Paris", "Tunis"], ["Paris", "Bamako"], ["Paris", "Yaoundé"], ["Paris", "Douala"],
  ["Paris", "Brazzaville"], ["Paris", "Kinshasa"], ["Paris", "Lomé"], ["Paris", "Cotonou"],
  ["Paris", "Conakry"], ["Paris", "Ouagadougou"], ["Paris", "Niamey"], ["Paris", "Libreville"],
  ["Paris", "Antananarivo"], ["Paris", "Pointe-Noire"],
  ["Lyon", "Alger"], ["Lyon", "Tunis"], ["Lyon", "Casablanca"], ["Lyon", "Dakar"],
  ["Marseille", "Alger"], ["Marseille", "Tunis"], ["Marseille", "Casablanca"], ["Marseille", "Oran"],
  ["Toulouse", "Alger"], ["Toulouse", "Casablanca"],
  ["Bordeaux", "Dakar"], ["Bordeaux", "Casablanca"],
  ["Nice", "Tunis"], ["Nice", "Alger"],
  ["Bruxelles", "Casablanca"], ["Bruxelles", "Kinshasa"],
  ["Genève", "Tunis"], ["Genève", "Casablanca"],
  ["Montréal", "Paris"], ["Montréal", "Casablanca"], ["Montréal", "Alger"],
  ["Londres", "Casablanca"],
];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function routeSlug(from: string, to: string) { return `${slugify(from)}_${slugify(to)}`; }

function escape(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function urlEntry(loc: string, lastmod?: string, priority = "0.6", changefreq = "daily") {
  return `<url><loc>${escape(loc)}</loc>${lastmod ? `<lastmod>${escape(lastmod)}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function sitemapEntry(loc: string, lastmod: string) {
  return `<sitemap><loc>${escape(loc)}</loc><lastmod>${escape(lastmod)}</lastmod></sitemap>`;
}

function wrapUrlset(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}
function wrapIndex(maps: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.join("\n")}\n</sitemapindex>`;
}

function xmlResponse(body: string, maxAge = 1800) {
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const now = new Date().toISOString();

  // ---- INDEX ----
  if (!type) {
    return xmlResponse(
      wrapIndex([
        sitemapEntry(`${FN_BASE}?type=static`, now),
        sitemapEntry(`${FN_BASE}?type=routes`, now),
        sitemapEntry(`${FN_BASE}?type=blog`, now),
        sitemapEntry(`${FN_BASE}?type=voyages`, now),
        sitemapEntry(`${FN_BASE}?type=missions`, now),
      ]),
      3600,
    );
  }

  // ---- STATIC ----
  if (type === "static") {
    const urls = STATIC_PATHS.map((p) => urlEntry(`${SITE_URL}${p.path}`, undefined, p.priority, p.changefreq));
    return xmlResponse(wrapUrlset(urls), 86400);
  }

  // ---- ROUTES (popular city pairs) ----
  if (type === "routes") {
    const urls = POPULAR_ROUTES.map(([from, to]) =>
      urlEntry(`${SITE_URL}/explore/${routeSlug(from, to)}`, undefined, "0.7", "weekly"),
    );
    return xmlResponse(wrapUrlset(urls), 86400);
  }

  // ---- BLOG ----
  if (type === "blog") {
    const urls = BLOG_POSTS.map((p) =>
      urlEntry(`${SITE_URL}/blog/${p.slug}`, p.updatedAt, "0.7", "monthly"),
    );
    return xmlResponse(wrapUrlset(urls), 86400);
  }

  // ---- VOYAGES (active trips) ----
  if (type === "voyages") {
    const urls: string[] = [];
    try {
      const { data } = await supabase.rpc("get_public_voyages");
      for (const v of (data as any[]) || []) {
        urls.push(urlEntry(`${SITE_URL}/trajet/${v.id}`, v.departure_date || undefined, "0.8", "daily"));
      }
    } catch (e) { console.error("voyages", e); }
    return xmlResponse(wrapUrlset(urls), 1800);
  }

  // ---- MISSIONS ----
  if (type === "missions") {
    const urls: string[] = [];
    try {
      const { data } = await supabase.rpc("get_public_pending_missions");
      for (const m of (data as any[]) || []) {
        urls.push(urlEntry(`${SITE_URL}/needit/${m.id}`, m.created_at || undefined, "0.7", "daily"));
      }
    } catch (e) { console.error("missions", e); }
    return xmlResponse(wrapUrlset(urls), 1800);
  }

  return new Response("Unknown sitemap type", { status: 400, headers: corsHeaders });
});
