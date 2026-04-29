import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Rate limit: 30 emails / hour per caller (only effective for end-user calls; service-role bypasses)
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_SEC = 3600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    const token = authHeader?.replace("Bearer ", "");
    const isServiceRole = token && serviceRoleKey && token === serviceRoleKey;
    const isCronAuth = token && cronSecret && token === cronSecret;

    if (!isServiceRole && !isCronAuth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply per-IP rate limit when called via cron secret only (service-role internal calls bypass)
    if (isCronAuth && SUPABASE_URL && serviceRoleKey) {
      const ipRaw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      // Use a deterministic UUID derived from IP via crypto subtle (namespace abuse OK for limiter)
      const ipHash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(ipRaw));
      const bytes = new Uint8Array(ipHash).slice(0, 16);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const pseudoUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

      const admin = createClient(SUPABASE_URL, serviceRoleKey);
      const { data: allowed } = await admin.rpc("check_rate_limit", {
        _user_id: pseudoUuid,
        _action: "send_email",
        _max_requests: RATE_LIMIT_MAX,
        _window_seconds: RATE_LIMIT_WINDOW_SEC,
      });
      if (allowed === false) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, html, from } = (await req.json()) as EmailPayload;

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Nidit <noreply@nidit.app>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(`Resend error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Send email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
