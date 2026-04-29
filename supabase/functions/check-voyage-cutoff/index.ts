import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // ── 1. Cutoff warning notifications + emails ──
    const { data: voyages, error: vErr } = await supabase
      .from("voyages")
      .select("id, user_id, departure_city, arrival_city, departure_date, departure_time, cutoff_hours")
      .eq("status", "active")
      .gte("departure_date", today);

    if (vErr) throw vErr;

    let notified = 0;

    for (const v of voyages || []) {
      const depTime = new Date(
        v.departure_date + "T" + (v.departure_time || "00:00")
      ).getTime();
      const cutoffMs = (v.cutoff_hours ?? 24) * 60 * 60 * 1000;
      const remaining = depTime - Date.now();

      // Within 2x cutoff window but still before departure
      if (remaining > 0 && remaining < cutoffMs * 2) {
        const notifType = `cutoff_warning:${v.id}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", v.user_id)
          .eq("type", notifType)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const hoursLeft = Math.round(remaining / (60 * 60 * 1000));
        const route = `${v.departure_city} → ${v.arrival_city}`;

        // Insert in-app notification (i18n + fallback FR)
        const { insertNotification } = await import("../_shared/notifications.ts");
        await insertNotification(supabase, {
          user_id: v.user_id,
          type: notifType,
          i18n_key: "notif.voyage_cutoff_soon",
          i18n_params: { route, hours: hoursLeft },
          fallback_title: "⏰ Voyage bientôt fermé",
          fallback_message: `Votre voyage ${route} se ferme aux nouveaux matchs dans ~${hoursLeft}h. Modifiez le délai si besoin.`,
        });

        // Send email via Resend
        if (resendApiKey) {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(v.user_id);
          const email = userData?.user?.email;

          if (email) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Nidit <noreply@nidit.app>",
                  to: [email],
                  subject: `⏰ Votre voyage ${route} se ferme bientôt`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #1a1a2e;">⏰ Voyage bientôt fermé aux matchs</h2>
                      <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Bonjour,
                      </p>
                      <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Votre voyage <strong>${route}</strong> se ferme aux nouveaux matchs dans environ <strong>${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}</strong>.
                      </p>
                      <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Si vous souhaitez prolonger la durée d'acceptation des matchs, vous pouvez modifier le délai de fermeture depuis la page détail de votre voyage.
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://we-app-you.lovable.app/voyage/${v.id}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                          Voir mon voyage
                        </a>
                      </div>
                      <p style="color: #999; font-size: 12px;">
                        — L'équipe Nidit
                      </p>
                    </div>
                  `,
                }),
              });
            } catch (emailErr) {
              console.error("Email send error:", emailErr);
            }
          }
        }

        notified++;
      }
    }

    // ── 2. Auto-complete past voyages ──
    // Set voyages to 'completed' when departure date + time has passed
    let completed = 0;

    const { data: pastVoyages, error: pErr } = await supabase
      .from("voyages")
      .select("id, user_id, departure_city, arrival_city, departure_date, departure_time")
      .eq("status", "active");

    if (pErr) throw pErr;

    for (const v of pastVoyages || []) {
      const depTime = new Date(
        v.departure_date + "T" + (v.departure_time || "23:59")
      ).getTime();

      if (Date.now() > depTime) {
        // Check if voyage had any matches (accepted shipments or needit missions)
        const [{ count: shipmentCount }, { count: missionCount }] = await Promise.all([
          supabase.from("shipments").select("id", { count: "exact", head: true }).eq("voyageur_id", v.user_id).in("status", ["accepted", "picked_up", "in_transit", "delivered"]),
          supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("voyageur_id", v.user_id).in("status", ["accepted", "picked_up", "in_transit", "completed"]),
        ]);

        const hasMatches = ((shipmentCount ?? 0) + (missionCount ?? 0)) > 0;

        await supabase
          .from("voyages")
          .update({ status: "completed" })
          .eq("id", v.id);

        const route = `${v.departure_city} → ${v.arrival_city}`;

        if (!hasMatches) {
          // Notify: expired without any match
          const notifType = `voyage_expired_no_match:${v.id}`;
          await supabase.from("notifications").insert({
            user_id: v.user_id,
            title: "😕 Voyage expiré sans match",
            message: `Votre voyage ${route} a expiré sans aucun colis ou mission accepté. Créez un nouveau voyage pour recevoir des demandes !`,
            type: notifType,
          });

          // Send email
          if (resendApiKey) {
            const { data: userData } = await supabase.auth.admin.getUserById(v.user_id);
            const email = userData?.user?.email;
            if (email) {
              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "Nidit <noreply@nidit.app>",
                    to: [email],
                    subject: `😕 Votre voyage ${route} a expiré sans match`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1a1a2e;">😕 Voyage expiré sans match</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6;">
                          Bonjour,
                        </p>
                        <p style="color: #555; font-size: 16px; line-height: 1.6;">
                          Votre voyage <strong>${route}</strong> du <strong>${v.departure_date}</strong> a expiré sans qu'aucun colis ou mission n'ait été matché.
                        </p>
                        <p style="color: #555; font-size: 16px; line-height: 1.6;">
                          Pas de souci ! Vous pouvez créer un nouveau voyage pour recevoir de nouvelles demandes.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="https://we-app-you.lovable.app/new-trip" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            Créer un nouveau voyage
                          </a>
                        </div>
                        <p style="color: #999; font-size: 12px;">
                          — L'équipe Nidit
                        </p>
                      </div>
                    `,
                  }),
                });
              } catch (emailErr) {
                console.error("Email send error (expired no match):", emailErr);
              }
            }
          }
        } else {
          // Standard completion notification
          await supabase.from("notifications").insert({
            user_id: v.user_id,
            title: "✅ Voyage terminé",
            message: `Votre voyage ${route} est maintenant terminé.`,
            type: `voyage_completed:${v.id}`,
          });
        }

        completed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, notified, completed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-voyage-cutoff error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
