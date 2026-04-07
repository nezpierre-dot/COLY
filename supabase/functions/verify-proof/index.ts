import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { proof_id } = await req.json();

    if (!proof_id || typeof proof_id !== "string") {
      return new Response(
        JSON.stringify({ error: "proof_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the proof
    const { data: proof, error: fetchErr } = await supabase
      .from("proof_verifications")
      .select("*")
      .eq("proof_id", proof_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!proof) {
      return new Response(
        JSON.stringify({ verified: false, error: "Preuve introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified if not already
    if (!proof.verified_at) {
      const { error: updateErr } = await supabase
        .from("proof_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", proof.id);

      if (updateErr) throw updateErr;
    }

    // Get uploader profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", proof.uploaded_by)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        verified: true,
        proof_id: proof.proof_id,
        proof_type: proof.proof_type,
        photo_url: proof.photo_url,
        latitude: proof.latitude,
        longitude: proof.longitude,
        uploaded_by: profile?.full_name || "Utilisateur",
        avatar_url: profile?.avatar_url,
        created_at: proof.created_at,
        verified_at: proof.verified_at || new Date().toISOString(),
        first_verification: !proof.verified_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
