import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || (token !== cronSecret && token !== serviceRoleKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Find shipments delivered between 24h and 48h ago (avoid spamming)
    const { data: deliveredShipments, error: fetchErr } = await supabase
      .from("shipments")
      .select("id, user_id, voyageur_id, updated_at")
      .eq("status", "delivered")
      .lte("updated_at", twentyFourHoursAgo)
      .gte("updated_at", fortyEightHoursAgo);

    if (fetchErr) throw fetchErr;

    // Also check needit missions
    const { data: deliveredMissions, error: fetchErr2 } = await supabase
      .from("needit_missions")
      .select("id, user_id, voyageur_id, updated_at")
      .eq("status", "completed")
      .lte("updated_at", twentyFourHoursAgo)
      .gte("updated_at", fortyEightHoursAgo);

    if (fetchErr2) throw fetchErr2;

    const allItems = [
      ...(deliveredShipments || []).map(s => ({ ...s, type: "shipment" })),
      ...(deliveredMissions || []).map(m => ({ ...m, type: "needit" })),
    ];

    let sent = 0;

    for (const item of allItems) {
      // Get existing ratings for this shipment
      const { data: existingRatings } = await supabase
        .from("ratings")
        .select("rater_id")
        .eq("shipment_id", item.id);

      const raterIds = (existingRatings || []).map(r => r.rater_id);

      // Check if we already sent a reminder notification for this item
      const usersToNotify: { userId: string; role: string }[] = [];

      // Demandeur hasn't rated
      if (item.user_id && !raterIds.includes(item.user_id)) {
        usersToNotify.push({ userId: item.user_id, role: "demandeur" });
      }

      // Voyageur hasn't rated
      if (item.voyageur_id && !raterIds.includes(item.voyageur_id)) {
        usersToNotify.push({ userId: item.voyageur_id, role: "voyageur" });
      }

      for (const { userId, role } of usersToNotify) {
        const notifType = `rating_reminder:${item.id}`;

        // Check if reminder already sent
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", notifType)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const otherRole = role === "demandeur" ? "voyageur" : "demandeur";

        await supabase.from("notifications").insert({
          user_id: userId,
          title: "N'oubliez pas de noter ! ⭐",
          message: `Votre livraison est terminée depuis 24h. Prenez un moment pour noter le ${otherRole}.`,
          type: notifType,
        });

        // Send email reminder via Resend
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", userId)
            .single();

          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          const userEmail = authUser?.user?.email;

          if (userEmail) {
            const userName = profile?.full_name || "Utilisateur";
            await supabase.functions.invoke("send-email", {
              body: {
                to: userEmail,
                subject: "N'oubliez pas de noter ! ⭐",
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                    <h2 style="color:#005BB5;margin-bottom:16px;">Bonjour ${userName} 👋</h2>
                    <p style="color:#333;line-height:1.6;">
                      Votre livraison est terminée depuis 24h. Prenez un moment pour noter le <strong>${otherRole}</strong>.
                    </p>
                    <p style="color:#333;line-height:1.6;">
                      Votre avis aide la communauté Nidit à maintenir un service de qualité !
                    </p>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="https://we-app-you.lovable.app/dashboard" 
                         style="background:#007AFF;color:white;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block;">
                        Noter maintenant ⭐
                      </a>
                    </div>
                    <p style="color:#999;font-size:12px;margin-top:24px;">— L'équipe Nidit</p>
                  </div>
                `,
              },
            });
          }
        } catch (emailErr) {
          console.error("Failed to send rating reminder email:", emailErr);
        }

        sent++;
      }
    }

    return new Response(JSON.stringify({ processed: allItems.length, reminders_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Rating reminders error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
