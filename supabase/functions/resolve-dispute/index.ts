import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Verify admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const { dispute_id, action } = await req.json();
    if (!dispute_id || !["resolve", "refund"].includes(action)) {
      throw new Error("Invalid parameters: dispute_id and action (resolve|refund) required");
    }

    // Get the dispute details
    const { data: dispute, error: disputeErr } = await supabaseAdmin
      .from("disputes")
      .select("id, shipment_id, status")
      .eq("id", dispute_id)
      .single();
    if (disputeErr || !dispute) throw new Error("Dispute not found");
    if (!["open", "investigating"].includes(dispute.status)) {
      throw new Error("Dispute already resolved");
    }

    // Get shipment details (need tarif for refund amount, and user info)
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from("shipments")
      .select("id, tarif, user_id, voyageur_id, escrow_status")
      .eq("id", dispute.shipment_id)
      .single();
    if (shipErr || !shipment) throw new Error("Shipment not found");

    // Get the demandeur's stripe_customer_id for refund
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", shipment.user_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (action === "refund") {
      // Find the most recent successful payment intent for this customer
      let refundResult = null;

      if (profile?.stripe_customer_id) {
        // Search for payment intents linked to this customer
        const paymentIntents = await stripe.paymentIntents.list({
          customer: profile.stripe_customer_id,
          limit: 10,
        });

        // Find the PI matching the shipment tarif amount
        const tarifAmount = Math.round(parseFloat(shipment.tarif.replace(/[^0-9.,]/g, "").replace(",", ".")) * 100);

        const matchingPI = paymentIntents.data.find(
          (pi) => pi.status === "succeeded" && pi.amount === tarifAmount
        );

        if (matchingPI) {
          // Issue Stripe refund
          refundResult = await stripe.refunds.create({
            payment_intent: matchingPI.id,
            reason: "requested_by_customer",
          });
        }
      }

      // Update dispute status
      await supabaseAdmin.from("disputes").update({
        status: "refunded",
        resolution: refundResult
          ? `Remboursement Stripe effectué (${refundResult.id}). Montant : ${(refundResult.amount / 100).toFixed(2)}€`
          : "Remboursement enregistré (aucun paiement Stripe trouvé pour remboursement automatique).",
        resolved_by: user.id,
      }).eq("id", dispute_id);

      // Update escrow status
      await supabaseAdmin.from("shipments").update({
        escrow_status: "refunded",
      }).eq("id", shipment.id);

      // Notify demandeur
      await supabaseAdmin.from("notifications").insert({
        user_id: shipment.user_id,
        title: "Remboursement effectué 💰",
        message: `Votre litige a été résolu en votre faveur. Le montant de ${shipment.tarif} vous sera remboursé.`,
        type: "dispute_refunded:" + dispute_id,
      });

      // Notify voyageur
      if (shipment.voyageur_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: shipment.voyageur_id,
          title: "Litige résolu — Remboursement ⚠️",
          message: `Un litige a été résolu avec remboursement au demandeur pour le colis COLY-${shipment.id.slice(0, 8).toUpperCase()}.`,
          type: "dispute_refunded:" + dispute_id,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        action: "refund",
        stripe_refund_id: refundResult?.id || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // action === "resolve" — release escrow to voyageur
      // If there's a connected account for the voyageur, we could transfer here
      // For now, just mark as released

      await supabaseAdmin.from("disputes").update({
        status: "resolved",
        resolution: "Litige résolu par l'administration. Paiement libéré au voyageur.",
        resolved_by: user.id,
      }).eq("id", dispute_id);

      await supabaseAdmin.from("shipments").update({
        escrow_status: "released",
      }).eq("id", shipment.id);

      // Notify both parties
      await supabaseAdmin.from("notifications").insert({
        user_id: shipment.user_id,
        title: "Litige résolu ✅",
        message: "Votre litige a été examiné et résolu. Le paiement a été libéré au voyageur.",
        type: "dispute_resolved:" + dispute_id,
      });

      if (shipment.voyageur_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: shipment.voyageur_id,
          title: "Paiement libéré 💰",
          message: `Le litige pour le colis COLY-${shipment.id.slice(0, 8).toUpperCase()} a été résolu. Votre paiement de ${shipment.tarif} est libéré.`,
          type: "dispute_resolved:" + dispute_id,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        action: "resolve",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("resolve-dispute error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
