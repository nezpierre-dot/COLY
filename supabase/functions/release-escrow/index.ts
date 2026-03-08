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

  // Verify CRON_SECRET for scheduled invocations
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow service role calls
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authHeader?.includes(supabaseAnonKey ?? "___")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Find shipments with escrow expired and no open dispute
    const { data: expiredEscrows, error: fetchErr } = await supabaseAdmin
      .from("shipments")
      .select("id, user_id, voyageur_id, tarif, escrow_expires_at")
      .eq("escrow_status", "held")
      .lte("escrow_expires_at", new Date().toISOString());

    if (fetchErr) throw fetchErr;

    const results: string[] = [];

    for (const shipment of expiredEscrows ?? []) {
      // Check for open disputes
      const { data: disputes } = await supabaseAdmin
        .from("disputes")
        .select("id")
        .eq("shipment_id", shipment.id)
        .in("status", ["open", "investigating"])
        .limit(1);

      if (disputes && disputes.length > 0) {
        // Keep escrow held while dispute is active
        results.push(`${shipment.id}: dispute active, escrow maintained`);
        continue;
      }

      // Release escrow - update status
      await supabaseAdmin
        .from("shipments")
        .update({ escrow_status: "released" })
        .eq("id", shipment.id);

      // Notify voyageur that payment is released
      if (shipment.voyageur_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: shipment.voyageur_id,
          title: "Paiement libéré 💰",
          message: `Le paiement de ${shipment.tarif} a été libéré après la période de sécurité de 48h.`,
          type: "escrow_released:" + shipment.id,
        });
      }

      // Notify demandeur
      if (shipment.user_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: shipment.user_id,
          title: "Transaction finalisée ✅",
          message: "La période de sécurité de 48h est terminée. Le paiement a été libéré au voyageur.",
          type: "escrow_released:" + shipment.id,
        });
      }

      results.push(`${shipment.id}: escrow released`);
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
