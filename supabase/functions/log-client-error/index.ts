// Logs client-side JS errors to public.client_errors via service role.
// Public endpoint (verify_jwt=false). Authenticated user_id is extracted if present.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Payload {
  message?: string;
  stack?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

// Rate limit per IP: 60 errors / 5 min (avoid log flooding)
const RATE_MAX = 60;
const RATE_WIN = 300;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const message = String(body.message ?? "").slice(0, 2000);
    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try extract user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && SUPABASE_ANON_KEY) {
      try {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch { /* anonymous */ }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // IP-based rate limit (or user-based if logged in)
    const ipRaw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const ipHash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(ipRaw));
    const bytes = new Uint8Array(ipHash).slice(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const pseudoUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    const limitKey = userId ?? pseudoUuid;

    const { data: allowed } = await admin.rpc("check_rate_limit", {
      _user_id: limitKey,
      _action: "log_client_error",
      _max_requests: RATE_MAX,
      _window_seconds: RATE_WIN,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ ok: true, throttled: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin.from("client_errors").insert({
      user_id: userId,
      message,
      stack: body.stack ? String(body.stack).slice(0, 8000) : null,
      route: body.route ? String(body.route).slice(0, 500) : null,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    if (error) {
      console.error("client_errors insert failed", error);
      return new Response(JSON.stringify({ error: "insert failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-client-error error", e);
    return new Response(JSON.stringify({ error: "Internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
