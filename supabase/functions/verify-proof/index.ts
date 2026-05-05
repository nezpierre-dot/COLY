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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Require authentication
    const authHeader = req.headers.get("Authorization") ?? "";
    let callerId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anon = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await anon.auth.getClaims(token);
      callerId = (claims?.claims?.sub as string) ?? null;
    }
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

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

    // Determine if caller is a party to the related shipment/mission
    let involved = proof.uploaded_by === callerId;
    if (!involved && proof.shipment_id) {
      const { data: ship } = await supabase
        .from("shipments")
        .select("user_id, voyageur_id")
        .eq("id", proof.shipment_id)
        .maybeSingle();
      if (ship && (ship.user_id === callerId || ship.voyageur_id === callerId)) {
        involved = true;
      } else {
        const { data: mis } = await supabase
          .from("needit_missions")
          .select("user_id, voyageur_id")
          .eq("id", proof.shipment_id)
          .maybeSingle();
        if (mis && (mis.user_id === callerId || mis.voyageur_id === callerId)) {
          involved = true;
        }
      }
    }

    if (!involved) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified if not already
    const wasUnverified = !proof.verified_at;
    if (wasUnverified) {
      await supabase
        .from("proof_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", proof.id);
    }

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
        first_verification: wasUnverified,
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
