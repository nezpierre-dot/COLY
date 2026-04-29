// Edge function: track-web-vitals
// Receives Web Vitals beacons from the browser and stores them in `web_vitals`.
// Public (verify_jwt = false) so we can also collect from anonymous visitors.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    if (!body.metric_name || typeof body.metric_value !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_METRICS.has(body.metric_name)) {
      return new Response(JSON.stringify({ error: "Unknown metric" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Try to read user from JWT (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const truncate = (v: unknown, max: number) =>
      typeof v === "string" ? v.slice(0, max) : null;

    const { error } = await admin.from("web_vitals").insert({
      user_id: userId,
      session_id: truncate(body.session_id, 64),
      metric_name: body.metric_name,
      metric_value: body.metric_value,
      metric_rating: truncate(body.metric_rating, 32),
      metric_id: truncate(body.metric_id, 128),
      navigation_type: truncate(body.navigation_type, 32),
      page_url: truncate(body.page_url, 512),
      user_agent: truncate(body.user_agent, 512),
      device_type: truncate(body.device_type, 32),
      connection_type: truncate(body.connection_type, 32),
    });

    if (error) {
      console.error("web_vitals insert error", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("web_vitals handler error", err);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
