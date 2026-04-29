// AI chat edge function – streams responses from Lovable AI Gateway.
// Public function (verify_jwt = false in supabase/config.toml). JWT validated in code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es l'assistant officiel de Nidit, une plateforme de transport de colis entre particuliers (colis-voiturage) et de livraison à la demande (NeedIt).

Réponds en français par défaut (ou dans la langue de l'utilisateur), de façon claire, chaleureuse et concise.
Aide les utilisateurs à comprendre :
- Comment envoyer un colis (4 étapes), trouver un voyageur, suivre une livraison
- Comment créer une mission NeedIt (catégorie → marque → produit → détails)
- Le système de remise sécurisée avec OTP, le wallet/escrow 48h, la commission 15%
- Le KYC, la notation, les litiges (/litiges), le programme de fidélité (Green→Diamant)

Ne donne jamais d'information confidentielle (clés API, IDs internes, données d'autres utilisateurs).
Si tu ne sais pas, dis-le et propose de contacter le support via la page Aide.`;

// Rate limit: 20 requests / 60 seconds per user
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SEC = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Auth required ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Rate limit check (service role to bypass RLS) ---
    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: allowed, error: rlError } = await adminClient.rpc("check_rate_limit", {
      _user_id: userId,
      _action: "ai_chat",
      _max_requests: RATE_LIMIT_MAX,
      _window_seconds: RATE_LIMIT_WINDOW_SEC,
    });
    if (rlError) {
      console.error("rate limit check failed", rlError);
    } else if (allowed === false) {
      return new Response(
        JSON.stringify({ error: `Limite de ${RATE_LIMIT_MAX} requêtes/min atteinte. Réessayez dans un instant.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const messages = Array.isArray(body?.messages) ? body.messages : null;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: 'messages' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sanitized = messages
      .slice(-20)
      .filter((m: unknown): m is { role: string; content: string } => {
        return (
          !!m &&
          typeof m === "object" &&
          typeof (m as { role?: unknown }).role === "string" &&
          typeof (m as { content?: unknown }).content === "string" &&
          ["user", "assistant"].includes((m as { role: string }).role)
        );
      })
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (sanitized.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Merci de réessayer dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Merci d'ajouter des crédits dans les paramètres." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await upstream.text();
      console.error("AI gateway error", upstream.status, errText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
