// @ts-nocheck
// Server-side rendering of OG meta tags for crawlers (Facebook, Twitter, WhatsApp, LinkedIn, Slack...)
// Real users are redirected to the SPA via JS fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://nidit.fr";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Discordbot|Pinterest|SkypeUriPreview|vkShare|Google-PageRenderer|bingbot|googlebot|Applebot|redditbot|Embedly/i;

const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path format: /og-meta/voyage/:id  or  /og-meta/mission/:id  or  /og-meta/colis/:id
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: ["og-meta", type, id]  (or sometimes just [type, id] depending on routing)
  const idx = parts.indexOf("og-meta");
  const type = idx >= 0 ? parts[idx + 1] : parts[0];
  const id = idx >= 0 ? parts[idx + 2] : parts[1];
  const ua = req.headers.get("user-agent") || "";
  const isBot = BOT_UA.test(ua);

  const meta = await fetchMeta(type, id);
  const canonical = `${SITE_URL}/${typeToPath(type)}/${id}`;
  const ogImage = `${FN_BASE}/og-image?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;

  const html = renderHtml({
    title: meta.title,
    description: meta.description,
    canonical,
    ogImage,
    isBot,
    spaUrl: canonical,
  });

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
});

function typeToPath(type: string) {
  if (type === "voyage") return "trajet";
  if (type === "mission") return "needit";
  if (type === "colis") return "colis";
  return type;
}

async function fetchMeta(type: string, id: string): Promise<{ title: string; description: string }> {
  try {
    if (type === "voyage") {
      const { data } = await supabase.rpc("get_public_voyage", { _id: id });
      const v = data?.[0];
      if (v) {
        return {
          title: `${v.departure_city} → ${v.arrival_city} • ${formatDate(v.departure_date)} | Nidit`,
          description: `Voyage ${v.transport_method} entre ${v.departure_city} (${v.departure_country}) et ${v.arrival_city} (${v.arrival_country}). Envoyez votre colis avec un voyageur de confiance sur Nidit.`,
        };
      }
    } else if (type === "mission") {
      const { data } = await supabase.rpc("get_public_mission", { _id: id });
      const m = data?.[0];
      if (m) {
        return {
          title: `NeedIt : ${m.product_name} depuis ${m.country} | Nidit`,
          description: `Quelqu'un cherche ${m.product_name}${m.city ? ` à ${m.city}` : ""} (${m.country})${m.prix_max ? ` — budget max ${m.prix_max}` : ""}. Acceptez la mission sur Nidit.`,
        };
      }
    } else if (type === "colis") {
      const { data } = await supabase.rpc("get_public_shipment", { _id: id });
      const s = data?.[0];
      if (s) {
        return {
          title: `Colis ${s.departure_city} → ${s.arrival_city} | Nidit`,
          description: `Colis taille ${s.size} à transporter de ${s.departure_city || "—"} vers ${s.arrival_city} (${s.arrival_country}). Tarif ${s.tarif} sur Nidit.`,
        };
      }
    }
  } catch (e) {
    console.error("og-meta fetch error", e);
  }
  return {
    title: "Nidit — Voyageurs & colis du quotidien",
    description: "Envoyez vos colis avec des voyageurs de confiance, partout dans le monde. Nidit met en relation expéditeurs et voyageurs vérifiés.",
  };
}

function formatDate(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function escape(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function renderHtml({ title, description, canonical, ogImage, isBot, spaUrl }: {
  title: string; description: string; canonical: string; ogImage: string; isBot: boolean; spaUrl: string;
}) {
  const t = escape(title);
  const d = escape(description);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Nidit" />
  <meta property="og:locale" content="fr_FR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${ogImage}" />
  ${isBot ? "" : `<meta http-equiv="refresh" content="0; url=${canonical}" /><script>window.location.replace(${JSON.stringify(spaUrl)});</script>`}
</head>
<body>
  <h1>${t}</h1>
  <p>${d}</p>
  <p><a href="${canonical}">Ouvrir sur Nidit</a></p>
</body>
</html>`;
}
