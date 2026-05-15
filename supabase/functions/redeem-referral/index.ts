// redeem-referral — attaches a freshly-signed-up user to their referrer.
//
// Flow:
//   1. The invite link carries ?ref=CODE. Signup.tsx stores it in localStorage.
//   2. On the first SIGNED_IN event (useAuth) the app POSTs { code } here.
//   3. This function runs the SECURITY DEFINER `redeem_referral` RPC under the
//      caller's JWT, which inserts a `referrals` row with status 'pending'.
//   4. The bonus is later released by the `release_referral_on_*` DB triggers
//      when the referred user completes their first delivered colis / mission.
//
// JWT verification is left ON (default) — we need a real authenticated user.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!code) {
      return new Response(JSON.stringify({ error: "missing_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client scoped to the caller's JWT so auth.uid() resolves inside redeem_referral()
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data, error } = await supabase.rpc("redeem_referral", { _code: code });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = data as string;
    return new Response(JSON.stringify({ status, ok: status === "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
