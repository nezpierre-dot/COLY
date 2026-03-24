import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find open disputes with no response in last 72h
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: openDisputes, error: dErr } = await adminClient
      .from("disputes")
      .select("id, shipment_id, user_id, reason, description, status, created_at, updated_at")
      .in("status", ["open"])
      .lt("updated_at", cutoff);

    if (dErr) {
      console.error("Error fetching disputes:", dErr);
      return new Response(JSON.stringify({ error: dErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openDisputes || openDisputes.length === 0) {
      return new Response(JSON.stringify({ escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let escalatedCount = 0;

    for (const dispute of openDisputes) {
      // Check if there are any messages in this dispute
      const { data: msgs } = await adminClient
        .from("dispute_messages")
        .select("id, created_at")
        .eq("dispute_id", dispute.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastActivity = msgs && msgs.length > 0 
        ? new Date(msgs[0].created_at) 
        : new Date(dispute.created_at);

      // Skip if there was recent activity
      if (lastActivity.getTime() > Date.now() - 72 * 60 * 60 * 1000) continue;

      // Escalate to "investigating"
      await adminClient
        .from("disputes")
        .update({ status: "investigating", updated_at: new Date().toISOString() })
        .eq("id", dispute.id);

      // Add system message
      await adminClient.from("dispute_messages").insert({
        dispute_id: dispute.id,
        sender_id: "00000000-0000-0000-0000-000000000000",
        sender_role: "admin",
        content: "⏰ Ce litige a été automatiquement escaladé car aucune réponse n'a été apportée dans les 72 heures. L'équipe support va examiner votre dossier en priorité.",
      });

      // Notify the dispute opener
      await adminClient.from("notifications").insert({
        user_id: dispute.user_id,
        title: "🔔 Litige escaladé",
        message: `Votre litige LIT-${dispute.id.substring(0, 8).toUpperCase()} a été escaladé automatiquement car sans réponse depuis 72h. Notre équipe le traite en priorité.`,
        type: "dispute_escalated:" + dispute.id,
      });

      // Email support about escalation
      if (resendApiKey) {
        const disputeRef = "LIT-" + dispute.id.substring(0, 8).toUpperCase();
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Nidit <noreply@nidit.app>",
            to: ["support@nidit.app"],
            subject: `🚨 Litige escaladé ${disputeRef} — sans réponse 72h`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #FF3B30, #FF6B4A); border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 20px;">🚨 Escalade automatique</h1>
                </div>
                <p style="color: #333; font-size: 14px;">Le litige <strong>${disputeRef}</strong> est resté sans réponse pendant plus de 72 heures et a été automatiquement escaladé.</p>
                <p style="color: #333; font-size: 14px;">Motif : ${dispute.reason}</p>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://we-app-you.lovable.app/litiges" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                    Traiter le litige
                  </a>
                </div>
              </div>
            `,
          }),
        });
      }

      escalatedCount++;
    }

    return new Response(JSON.stringify({ escalated: escalatedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("escalate-disputes error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
