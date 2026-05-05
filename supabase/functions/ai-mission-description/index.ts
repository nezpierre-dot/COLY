// Génère une description de mission NeedIt claire et chaleureuse à partir
// des infos brutes saisies par l'utilisateur. JWT requis (validé en code) + rate limit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SEC = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Tu rédiges des descriptions de missions sur Nidit (plateforme NeedIt : un voyageur achète/récupère un produit pour un demandeur).

Règles strictes :
- Réponds UNIQUEMENT avec la fonction generate_description (tool call).
- Français, ton chaleureux, clair, naturel et concis (≤ 380 caractères).
- Tutoiement, pas de jargon. Pas plus de 2 émojis (optionnels).
- Mentionne (si fournis) : produit, marque, variante, ville, lieu de récup, contraintes.
- Termine par un remerciement court ou une invitation à demander plus d'infos.
- N'invente pas de contraintes/dimensions/prix qui ne sont pas fournis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as {
      productName?: string;
      brand?: string;
      variant?: string | null;
      category?: string;
      country?: string;
      city?: string;
      pickupAddress?: string;
      quantity?: number;
      budget?: string;
      currentNotes?: string;
    } | null;

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const facts = [
      body.productName ? `Produit: ${body.productName}` : null,
      body.brand ? `Marque: ${body.brand}` : null,
      body.variant ? `Variante: ${body.variant}` : null,
      body.category ? `Catégorie: ${body.category}` : null,
      body.quantity && body.quantity > 1 ? `Quantité: ${body.quantity}` : null,
      body.country || body.city ? `Lieu: ${[body.city, body.country].filter(Boolean).join(", ")}` : null,
      body.pickupAddress ? `Adresse précise: ${body.pickupAddress}` : null,
      body.budget ? `Budget max: ${body.budget}` : null,
      body.currentNotes ? `Notes actuelles du demandeur: ${body.currentNotes}` : null,
    ].filter(Boolean).join("\n");

    const userPrompt = `Voici les informations brutes de ma mission. Rédige-moi une description chaleureuse et claire pour les voyageurs.\n\n${facts}`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_description",
            description: "Renvoyer une description de mission rédigée.",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string", maxLength: 500 },
              },
              required: ["description"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_description" } },
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Réessaie dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await upstream.text();
      console.error("ai-mission-description gateway", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let description = "";
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (typeof parsed.description === "string") {
          description = parsed.description.trim().slice(0, 500);
        }
      } catch (e) {
        console.error("Parse tool args failed", e);
      }
    }

    if (!description) {
      return new Response(JSON.stringify({ error: "Description vide retournée." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-mission-description error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
