// @ts-nocheck
// Dynamic OG image generator (1200x630 SVG → PNG via headless approach not needed; SVG works).
// Many crawlers (Facebook, Twitter) accept image/svg+xml only sometimes; we serve PNG via resvg.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resvg } from "npm:@resvg/resvg-js@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "site";
  const id = url.searchParams.get("id") || "";

  const data = await fetchData(type, id);
  const svg = renderSvg(type, data);

  try {
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();
    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error("og-image render error", e);
    // Fallback: return SVG
    return new Response(svg, {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
    });
  }
});

async function fetchData(type: string, id: string): Promise<any> {
  try {
    if (type === "voyage") {
      const { data } = await supabase.rpc("get_public_voyage", { _id: id });
      return data?.[0] || null;
    } else if (type === "mission") {
      const { data } = await supabase.rpc("get_public_mission", { _id: id });
      return data?.[0] || null;
    } else if (type === "colis") {
      const { data } = await supabase.rpc("get_public_shipment", { _id: id });
      return data?.[0] || null;
    }
  } catch (_) {}
  return null;
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function renderSvg(type: string, d: any): string {
  let title = "Nidit";
  let subtitle = "Voyageurs & colis du quotidien";
  let badge = "Nidit";
  let big = "→";

  if (d) {
    if (type === "voyage") {
      title = `${esc(d.departure_city)} → ${esc(d.arrival_city)}`;
      subtitle = `${esc(d.departure_country)} → ${esc(d.arrival_country)} • ${esc(d.departure_date || "")}`;
      badge = "TRAJET";
      big = "✈";
    } else if (type === "mission") {
      title = esc(d.product_name || "NeedIt");
      subtitle = `${esc(d.country)}${d.city ? " • " + esc(d.city) : ""}${d.prix_max ? " • budget " + esc(d.prix_max) : ""}`;
      badge = "NEEDIT";
      big = "🛍";
    } else if (type === "colis") {
      title = `${esc(d.departure_city || "—")} → ${esc(d.arrival_city)}`;
      subtitle = `Taille ${esc(d.size)} • ${esc(d.tarif)} • ${esc(d.arrival_country)}`;
      badge = "COLIS";
      big = "📦";
    }
  }

  // Truncate
  if (title.length > 38) title = title.slice(0, 36) + "…";
  if (subtitle.length > 80) subtitle = subtitle.slice(0, 78) + "…";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F172A"/>
      <stop offset="1" stop-color="#0060CC"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#30D158"/>
      <stop offset="1" stop-color="#0060CC"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1050" cy="120" r="280" fill="#0060CC" opacity="0.18"/>
  <circle cx="120" cy="540" r="220" fill="#30D158" opacity="0.12"/>

  <text x="80" y="120" font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#30D158" letter-spacing="6">${esc(badge)}</text>

  <text x="80" y="280" font-family="-apple-system, Helvetica, sans-serif" font-size="78" font-weight="800" fill="#FFFFFF">${title}</text>

  <text x="80" y="350" font-family="-apple-system, Helvetica, sans-serif" font-size="34" font-weight="500" fill="#E2E8F0" opacity="0.92">${subtitle}</text>

  <rect x="80" y="500" width="3" height="60" fill="url(#accent)"/>
  <text x="110" y="530" font-family="-apple-system, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#FFFFFF">Nidit</text>
  <text x="110" y="565" font-family="-apple-system, Helvetica, sans-serif" font-size="22" font-weight="400" fill="#E2E8F0">nidit.fr — Voyageurs &amp; colis du quotidien</text>

  <text x="1080" y="560" font-family="-apple-system, Helvetica, sans-serif" font-size="160" text-anchor="middle" fill="#FFFFFF" opacity="0.85">${esc(big)}</text>
</svg>`;
}
