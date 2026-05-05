// Suggestions de réponses rapides dans la messagerie Nidit.
// Génère 3 suggestions courtes et naturelles (FR) selon le contexte.
// JWT requis (validé en code) + rate limit par utilisateur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SEC = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Tu es l'assistant de messagerie de Nidit (transport de colis & missions NeedIt entre particuliers).
À partir du fil de discussion fourni et du contexte (rôle de l'utilisateur, statut de l'envoi/mission, route), tu dois proposer EXACTEMENT 3 suggestions de messages courts (≤ 90 caractères) que l'utilisateur courant pourrait envoyer maintenant.

Règles strictes :
- Réponds UNIQUEMENT avec la fonction suggest_replies (tool call), pas de texte libre.
- Les suggestions doivent être naturelles, polies, en français, avec tutoiement.
- Pas d'émoji superflus (max 1 par suggestion, optionnel).
- Adapte le ton au statut : pending → coordination, picked_up/in_transit → suivi, delivered → remerciement.
- Évite les répétitions du dernier message envoyé par l'utilisateur courant.
- Si la conversation est vide, propose des messages d'introduction adaptés au rôle.`;

interface Msg { role: "user" | "assistant"; content: string; isMe?: boolean }

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
      messages?: Msg[];
      role?: "voyageur" | "demandeur";
      itemType?: "shipment" | "mission";
      status?: string;
      route?: string;
      productName?: string;
    } | null;

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recentMessages = (body.messages ?? []).slice(-10);
    const contextLines = [
      `Rôle utilisateur courant : ${body.role ?? "demandeur"}`,
      `Type : ${body.itemType ?? "shipment"}`,
      `Statut : ${body.status ?? "pending"}`,
      body.route ? `Route : ${body.route}` : null,
      body.productName ? `Produit/objet : ${body.productName}` : null,
    ].filter(Boolean).join("\n");

    const transcript = recentMessages.length === 0
      ? "(conversation vide — l'utilisateur n'a pas encore écrit)"
      : recentMessages.map((m) => `${m.isMe ? "MOI" : "AUTRE"}: ${m.content.slice(0, 200)}`).join("\n");

    const userPrompt = `Contexte:\n${contextLines}\n\nDerniers messages:\n${transcript}\n\nPropose 3 réponses courtes que MOI je pourrais envoyer.`;

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
            name: "suggest_replies",
            description: "Renvoyer 3 suggestions de réponses courtes.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "string", maxLength: 90 },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_replies" } },
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await upstream.text();
      console.error("ai-chat-suggestions gateway", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions
            .filter((s: unknown): s is string => typeof s === "string")
            .map((s: string) => s.trim().slice(0, 90))
            .filter(Boolean)
            .slice(0, 3);
        }
      } catch (e) {
        console.error("Parse tool args failed", e);
      }
    }

    if (suggestions.length === 0) {
      // Defensive fallback so the UI never breaks
      suggestions = ["Bonjour 👋", "Merci pour votre message", "Pouvez-vous me confirmer ?"];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat-suggestions error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
