import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

interface DisputePayload {
  dispute_id: string;
  shipment_id: string;
  reason: string;
  description: string;
}

const SUPPORT_EMAIL = "support@nidit.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dispute_id, shipment_id, reason, description } = (await req.json()) as DisputePayload;
    if (!dispute_id || !shipment_id || !reason) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Determine if it's a shipment or a needit mission and get parties
    let voyageurId: string | null = null;
    let demandeurId: string | null = null;
    let itemLabel = "un envoi";
    let itemRef = "";

    const { data: shipment } = await adminClient.from("shipments")
      .select("voyageur_id, user_id, departure_city, arrival_city")
      .eq("id", shipment_id).maybeSingle();

    if (shipment) {
      voyageurId = shipment.voyageur_id;
      demandeurId = shipment.user_id;
      itemRef = "NIDIT-" + shipment_id.substring(0, 8).toUpperCase();
      itemLabel = `colis ${shipment.departure_city || "—"} → ${shipment.arrival_city}`;
    } else {
      const { data: mission } = await adminClient.from("needit_missions")
        .select("voyageur_id, user_id, product_name")
        .eq("id", shipment_id).maybeSingle();

      if (mission) {
        voyageurId = mission.voyageur_id;
        demandeurId = mission.user_id;
        itemRef = "NEED-" + shipment_id.substring(0, 8).toUpperCase();
        itemLabel = mission.product_name || "une mission NeedIt";
      }
    }

    // Determine who opened the dispute and who should be notified
    const isOpenedByVoyageur = user.id === voyageurId;
    const targetUserId = isOpenedByVoyageur ? demandeurId : voyageurId;
    const targetLabel = isOpenedByVoyageur ? "le voyageur" : "le demandeur";

    // In-app notification for the other party
    if (targetUserId) {
      await adminClient.from("notifications").insert({
        user_id: targetUserId,
        title: "⚠️ Litige ouvert",
        message: `Un litige a été ouvert par ${targetLabel} pour ${itemLabel} (${itemRef}). Motif : ${reason}.`,
        type: "dispute_opened:" + dispute_id,
      });
    }

    const safeLabel = escapeHtml(itemLabel);
    const safeRef = escapeHtml(itemRef);
    const safeReason = escapeHtml(reason);
    const safeDesc = escapeHtml(description || "");
    const disputeRef = "LIT-" + dispute_id.substring(0, 8).toUpperCase();
    const deepLink = `https://we-app-you.lovable.app/litiges`;


    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set, skipping emails");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = (heading: string, intro: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #FF3B30, #FF6B4A); border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px;">⚠️ ${heading}</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 15px;">${intro}</p>
          <table style="width: 100%; font-size: 14px; color: #333;">
            <tr><td style="padding: 4px 0; font-weight: 600;">Référence :</td><td>${disputeRef}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Envoi :</td><td>${safeRef} — ${safeLabel}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Motif :</td><td>${safeReason}</td></tr>
            ${safeDesc ? `<tr><td style="padding: 4px 0; font-weight: 600;">Description :</td><td>${safeDesc}</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${deepLink}" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Voir le litige
          </a>
        </div>
        <p style="color: #999; font-size: 11px; text-align: center; margin-top: 24px;">Nidit Transport collaboratif</p>
      </div>
    `;

    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Nidit <noreply@nidit.app>",
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Resend error:", data);
      }
    };

    // 1. Email the other party (voyageur or demandeur)
    if (targetUserId) {
      const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);
      const targetEmail = targetUser?.user?.email;
      if (targetEmail) {
        const intro = isOpenedByVoyageur
          ? "Un litige a été ouvert par le voyageur concernant une livraison que vous avez demandée."
          : "Un litige a été ouvert par le demandeur concernant une livraison qui vous est assignée.";
        await sendEmail(
          targetEmail,
          `⚠️ Litige ouvert — ${itemRef}`,
          emailHtml(
            "Litige ouvert sur votre livraison",
            intro
          )
        );
      }
    }

    // 2. Email support
    await sendEmail(
      SUPPORT_EMAIL,
      `⚠️ Nouveau litige ${disputeRef} — ${itemRef}`,
      emailHtml(
        "Nouveau litige signalé",
        `Un utilisateur a signalé un litige nécessitant votre attention.`
      )
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("notify-dispute error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
