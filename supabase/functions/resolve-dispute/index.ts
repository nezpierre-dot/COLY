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

    const { dispute_id, action, admin_response, photo_url } = await req.json();
    if (!dispute_id || !["resolve", "refund", "respond"].includes(action)) {
      throw new Error("Invalid parameters: dispute_id and action (resolve|refund|respond) required");
    }

    // Handle admin response (message without resolving)
    if (action === "respond") {
      if (!admin_response?.trim() && !photo_url) throw new Error("admin_response or photo_url is required for respond action");

      const { data: dispute, error: disputeErr } = await supabaseAdmin
        .from("disputes")
        .select("id, shipment_id, user_id, status")
        .eq("id", dispute_id)
        .single();
      if (disputeErr || !dispute) throw new Error("Dispute not found");

      // Update dispute status to investigating if still open
      if (dispute.status === "open") {
        await supabaseAdmin.from("disputes").update({
          status: "investigating",
          resolution: admin_response.trim(),
        }).eq("id", dispute_id);
      } else {
        await supabaseAdmin.from("disputes").update({
          resolution: admin_response.trim(),
        }).eq("id", dispute_id);
      }

      // Save message in dispute_messages history
      await supabaseAdmin.from("dispute_messages").insert({
        dispute_id,
        sender_id: user.id,
        sender_role: "admin",
        content: (admin_response || "").trim() || (photo_url ? "📷 Photo jointe" : ""),
        photo_url: photo_url || null,
      });

      // In-app notification to demandeur
      await supabaseAdmin.from("notifications").insert({
        user_id: dispute.user_id,
        title: "Réponse à votre litige 📩",
        message: admin_response.trim().substring(0, 200),
        type: "dispute_response:" + dispute_id,
      });

      // Email to demandeur
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const { data: demandeurUser } = await supabaseAdmin.auth.admin.getUserById(dispute.user_id);
        const demandeurEmail = demandeurUser?.user?.email;
        if (demandeurEmail) {
          const disputeRef = "LIT-" + dispute_id.substring(0, 8).toUpperCase();
          const safeResponse = admin_response.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="background: linear-gradient(135deg, #0D84FF, #5856D6); border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
                <h1 style="margin: 0; font-size: 20px;">📩 Réponse à votre litige</h1>
              </div>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px; color: #666; font-size: 12px; font-weight: 600;">Référence : ${disputeRef}</p>
                <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.5;">${safeResponse}</p>
              </div>
              <div style="text-align: center;">
                <a href="https://we-app-you.lovable.app/litiges" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">Voir le litige</a>
              </div>
              <p style="color: #999; font-size: 11px; text-align: center; margin-top: 24px;">Nidit Transport collaboratif</p>
            </div>
          `;
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Nidit <noreply@nidit.app>",
              to: [demandeurEmail],
              subject: `📩 Réponse à votre litige ${disputeRef}`,
              html,
            }),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, action: "respond" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          message: `Un litige a été résolu avec remboursement au demandeur pour le colis NIDIT-${shipment.id.slice(0, 8).toUpperCase()}.`,
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
