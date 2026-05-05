// @ts-nocheck
// Dynamic sitemap.xml — lists public voyages, missions, shipments and static pages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://nidit.fr";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_PATHS = ["/", "/explore", "/terms", "/faq", "/aide"];

function escape(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function urlEntry(loc: string, lastmod?: string, priority = "0.6", changefreq = "daily") {
  return `<url><loc>${escape(loc)}</loc>${lastmod ? `<lastmod>${escape(lastmod)}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const urls: string[] = [];
  for (const p of STATIC_PATHS) urls.push(urlEntry(`${SITE_URL}${p}`, undefined, p === "/" ? "1.0" : "0.7", "weekly"));

  try {
    const { data: voyages } = await supabase.rpc("get_public_voyages");
    for (const v of (voyages as any[]) || []) {
      urls.push(urlEntry(`${SITE_URL}/trajet/${v.id}`, v.departure_date || undefined, "0.8"));
    }
  } catch (e) { console.error("voyages", e); }

  try {
    const { data: missions } = await supabase.rpc("get_public_pending_missions");
    for (const m of (missions as any[]) || []) {
      urls.push(urlEntry(`${SITE_URL}/needit/${m.id}`, m.created_at || undefined, "0.7"));
    }
  } catch (e) { console.error("missions", e); }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600",
    },
  });
});
