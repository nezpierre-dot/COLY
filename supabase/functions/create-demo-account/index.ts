import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = "demo.claude@nidit.fr";
    const password = "DemoNidit2026!";

    // Try create
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Démo Claude" },
    });

    let userId = created?.user?.id;

    if (createErr && !userId) {
      // Likely already exists — find user
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) {
        userId = existing.id;
        // Reset password to known value
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        throw createErr;
      }
    }

    // Ensure profile
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        full_name: "Démo Claude",
        kyc_status: "verified",
        preferred_language: "fr",
      },
      { onConflict: "user_id" }
    );

    // Assign both roles so the demo can test both flows
    await admin.from("user_roles").upsert({ user_id: userId, role: "demandeur" }, { onConflict: "user_id,role" });
    await admin.from("user_roles").upsert({ user_id: userId, role: "voyageur" }, { onConflict: "user_id,role" });

    return new Response(
      JSON.stringify({ ok: true, email, password, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
