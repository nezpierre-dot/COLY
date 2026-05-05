import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Délais après lesquels une mission est considérée "expirée sans livraison"
const SHIPMENT_EXPIRY_DAYS = 7;   // jours après departure_date
const MISSION_EXPIRY_DAYS = 14;   // jours après acceptation/création

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: cron secret OR service role
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!token || (token !== cronSecret && token !== serviceKey && token !== anonKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false },
  });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const results = { shipments_refunded: 0, missions_refunded: 0, errors: [] as string[] };

  const parseTarif = (t: string | null | undefined): number => {
    if (!t) return 0;
    return Math.round(
      parseFloat(t.replace(/[^0-9.,]/g, "").replace(",", ".")) * 100
    );
  };

  const sendRefundEmail = async (email: string, ref: string, amountEur: string, role: "demandeur" | "voyageur") => {
    if (!resendApiKey || !email) return;
    const subject = role === "demandeur"
      ? `💰 Remboursement automatique — ${ref}`
      : `⚠️ Mission expirée — ${ref}`;
    const body = role === "demandeur"
      ? `Votre mission ${ref} a expiré sans livraison. Un remboursement de ${amountEur}€ a été déclenché automatiquement et apparaîtra sur votre moyen de paiement sous 5 à 10 jours ouvrés.`
      : `La mission ${ref} a expiré sans livraison confirmée. Le paiement protégé a été remboursé au demandeur. Si tu as livré, ouvre un litige sous 72h.`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#0D84FF,#5856D6);border-radius:16px;padding:24px;color:white;text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;font-size:20px;">${role === "demandeur" ? "💰 Remboursement effectué" : "⚠️ Mission expirée"}</h1>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:16px;">
          <p style="margin:0 0 8px;color:#666;font-size:12px;font-weight:600;">Référence : ${ref}</p>
          <p style="margin:0;color:#1a1a1a;font-size:15px;line-height:1.5;">${body}</p>
        </div>
        <div style="text-align:center;">
          <a href="https://nidit.fr/litiges" style="display:inline-block;background:#0D84FF;color:white;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Ouvrir Nidit</a>
        </div>
        <p style="color:#999;font-size:11px;text-align:center;margin-top:24px;">Nidit — Transport collaboratif</p>
      </div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Nidit <noreply@nidit.app>",
        to: [email],
        subject,
        html,
      }),
    });
  };

  const refundStripe = async (userId: string, amountCents: number) => {
    if (amountCents <= 0) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();
    if (!profile?.stripe_customer_id) return null;

    const pis = await stripe.paymentIntents.list({
      customer: profile.stripe_customer_id,
      limit: 20,
    });
    const match = pis.data.find(
      (pi) => pi.status === "succeeded" && pi.amount === amountCents
    );
    if (!match) return null;
    return await stripe.refunds.create({
      payment_intent: match.id,
      reason: "requested_by_customer",
    });
  };

  // ── 1. Shipments expirés ──
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SHIPMENT_EXPIRY_DAYS);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const { data: expired } = await supabase
      .from("shipments")
      .select("id, user_id, voyageur_id, tarif, departure_date, status, escrow_status")
      .in("status", ["accepted"])
      .neq("escrow_status", "refunded")
      .neq("escrow_status", "released")
      .lt("departure_date", cutoffDate);

    for (const s of expired || []) {
      try {
        // Skip if a notif of this type already exists (idempotence)
        const notifType = `auto_refund:${s.id}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", notifType)
          .limit(1);
        if (existing && existing.length > 0) continue;

        const amountCents = parseTarif(s.tarif);
        const refund = await refundStripe(s.user_id, amountCents);

        await supabase
          .from("shipments")
          .update({
            status: "cancelled",
            escrow_status: "refunded",
          })
          .eq("id", s.id);

        const ref = `NIDIT-${s.id.slice(0, 8).toUpperCase()}`;
        const message = refund
          ? `Mission expirée sans livraison. Remboursement automatique de ${(refund.amount / 100).toFixed(2)}€ effectué.`
          : `Mission expirée sans livraison. Aucun paiement Stripe correspondant à rembourser automatiquement — contacte le support si besoin.`;

        await supabase.from("notifications").insert({
          user_id: s.user_id,
          title: "Remboursement automatique 💰",
          message,
          type: notifType,
        });
        if (s.voyageur_id) {
          await supabase.from("notifications").insert({
            user_id: s.voyageur_id,
            title: "Mission expirée ⚠️",
            message: `La mission ${ref} a expiré sans livraison confirmée. Le demandeur a été remboursé. Ouvre un litige sous 72h si tu as livré.`,
            type: notifType,
          });
        }

        // Emails
        const { data: dem } = await supabase.auth.admin.getUserById(s.user_id);
        if (dem?.user?.email) {
          await sendRefundEmail(dem.user.email, ref, ((refund?.amount || amountCents) / 100).toFixed(2), "demandeur");
        }
        if (s.voyageur_id) {
          const { data: voy } = await supabase.auth.admin.getUserById(s.voyageur_id);
          if (voy?.user?.email) {
            await sendRefundEmail(voy.user.email, ref, "0", "voyageur");
          }
        }

        results.shipments_refunded++;
      } catch (e) {
        results.errors.push(`shipment ${s.id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    results.errors.push(`shipments scan: ${(e as Error).message}`);
  }

  // ── 2. Missions NeedIt expirées ──
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MISSION_EXPIRY_DAYS);

    const { data: expired } = await supabase
      .from("needit_missions")
      .select("id, user_id, voyageur_id, prix_max, status, created_at")
      .eq("status", "accepted")
      .lt("created_at", cutoff.toISOString());

    for (const m of expired || []) {
      try {
        const notifType = `auto_refund:${m.id}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", notifType)
          .limit(1);
        if (existing && existing.length > 0) continue;

        const amountCents = parseTarif(m.prix_max);
        const refund = await refundStripe(m.user_id, amountCents);

        await supabase
          .from("needit_missions")
          .update({ status: "cancelled" })
          .eq("id", m.id);

        const ref = `NEED-${m.id.slice(0, 8).toUpperCase()}`;
        const message = refund
          ? `Mission NeedIt expirée. Remboursement automatique de ${(refund.amount / 100).toFixed(2)}€ effectué.`
          : `Mission NeedIt expirée sans livraison. Aucun paiement Stripe à rembourser automatiquement.`;

        await supabase.from("notifications").insert({
          user_id: m.user_id,
          title: "Remboursement automatique 💰",
          message,
          type: notifType,
        });
        if (m.voyageur_id) {
          await supabase.from("notifications").insert({
            user_id: m.voyageur_id,
            title: "Mission expirée ⚠️",
            message: `La mission ${ref} a expiré. Le demandeur a été remboursé. Ouvre un litige sous 72h si tu as livré.`,
            type: notifType,
          });
        }

        const { data: dem } = await supabase.auth.admin.getUserById(m.user_id);
        if (dem?.user?.email) {
          await sendRefundEmail(dem.user.email, ref, ((refund?.amount || amountCents) / 100).toFixed(2), "demandeur");
        }
        if (m.voyageur_id) {
          const { data: voy } = await supabase.auth.admin.getUserById(m.voyageur_id);
          if (voy?.user?.email) {
            await sendRefundEmail(voy.user.email, ref, "0", "voyageur");
          }
        }

        results.missions_refunded++;
      } catch (e) {
        results.errors.push(`mission ${m.id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    results.errors.push(`missions scan: ${(e as Error).message}`);
  }

  return new Response(JSON.stringify({ success: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
