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

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Gather stats for last 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayISO = yesterday.toISOString();

    // Parallel queries
    const [
      newUsersRes,
      newShipmentsRes,
      deliveredRes,
      cancelledRes,
      newDisputesRes,
      openDisputesRes,
      newMissionsRes,
      completedMissionsRes,
      fraudRes,
      revenueRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", yesterdayISO),
      supabase.from("shipments").select("id", { count: "exact", head: true }).gte("created_at", yesterdayISO),
      supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", "delivered").gte("updated_at", yesterdayISO),
      supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("updated_at", yesterdayISO),
      supabase.from("disputes").select("id", { count: "exact", head: true }).gte("created_at", yesterdayISO),
      supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
      supabase.from("needit_missions").select("id", { count: "exact", head: true }).gte("created_at", yesterdayISO),
      supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("status", "completed").gte("updated_at", yesterdayISO),
      supabase.from("fraud_checks").select("id", { count: "exact", head: true }).in("result", ["fraudulent", "suspicious"]).gte("created_at", yesterdayISO),
      supabase.from("shipments").select("tarif").eq("status", "delivered").gte("updated_at", yesterdayISO),
    ]);

    const newUsers = newUsersRes.count ?? 0;
    const newShipments = newShipmentsRes.count ?? 0;
    const delivered = deliveredRes.count ?? 0;
    const cancelled = cancelledRes.count ?? 0;
    const newDisputes = newDisputesRes.count ?? 0;
    const openDisputes = openDisputesRes.count ?? 0;
    const newMissions = newMissionsRes.count ?? 0;
    const completedMissions = completedMissionsRes.count ?? 0;
    const fraudDetected = fraudRes.count ?? 0;

    // Calculate revenue
    let revenue = 0;
    if (revenueRes.data) {
      for (const r of revenueRes.data) {
        const t = r.tarif;
        if (t && /^\d+(\.\d+)?$/.test(t)) revenue += parseFloat(t);
      }
    }
    const commission = Math.round(revenue * 0.15 * 100) / 100;

    const dateStr = now.toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const statRow = (emoji: string, label: string, value: string | number, highlight = false) =>
      `<tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;">${emoji}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:15px;font-weight:700;text-align:right;${highlight ? "color:#dc2626;" : "color:#1e293b;"}">${value}</td>
      </tr>`;

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:22px;">📊 Récapitulatif quotidien</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">${dateStr}</p>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:14px;color:#64748b;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Activité des dernières 24h</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${statRow("👥", "Nouveaux utilisateurs", newUsers)}
            ${statRow("📦", "Nouveaux colis", newShipments)}
            ${statRow("✅", "Colis livrés", delivered)}
            ${statRow("❌", "Colis annulés", cancelled, cancelled > 0)}
            ${statRow("🛒", "Nouvelles missions NeedIt", newMissions)}
            ${statRow("🎯", "Missions complétées", completedMissions)}
          </table>

          <h2 style="font-size:14px;color:#64748b;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px;">Finance</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${statRow("💰", "Revenue brut (livraisons)", `${revenue.toFixed(2)} €`)}
            ${statRow("🏦", "Commission plateforme (15%)", `${commission.toFixed(2)} €`)}
          </table>

          <h2 style="font-size:14px;color:#64748b;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px;">Incidents</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${statRow("⚖️", "Nouveaux litiges", newDisputes, newDisputes > 0)}
            ${statRow("📋", "Litiges ouverts (total)", openDisputes, openDisputes > 5)}
            ${statRow("🚨", "Fraudes détectées", fraudDetected, fraudDetected > 0)}
          </table>

          ${fraudDetected > 0 || openDisputes > 5 ? `
          <div style="margin-top:20px;padding:14px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
            <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">⚡ Action requise</p>
            <p style="margin:4px 0 0;font-size:12px;color:#b91c1c;">
              ${fraudDetected > 0 ? `${fraudDetected} fraude(s) détectée(s). ` : ""}
              ${openDisputes > 5 ? `${openDisputes} litiges en attente. ` : ""}
              Connectez-vous au dashboard admin.
            </p>
          </div>` : `
          <div style="margin-top:20px;padding:14px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
            <p style="margin:0;font-size:13px;color:#166534;">✅ Aucun incident critique détecté aujourd'hui.</p>
          </div>`}

          <p style="margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;">
            Ce récapitulatif est envoyé automatiquement chaque jour à 8h. — Nidit Admin
          </p>
        </div>
      </div>
    `;

    // Get admin emails
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminEmails: string[] = [];
    if (adminRoles) {
      for (const r of adminRoles) {
        const { data: { user } } = await supabase.auth.admin.getUserById(r.user_id);
        if (user?.email) adminEmails.push(user.email);
      }
    }

    let sent = 0;
    for (const email of adminEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Nidit <noreply@nidit.app>",
            to: [email],
            subject: `📊 Récapitulatif quotidien — ${now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} | ${newUsers} utilisateurs, ${delivered} livraisons`,
            html,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          sent++;
          console.log(`Digest sent to ${email}:`, data.id);
        } else {
          console.error(`Digest failed for ${email}:`, data);
        }
      } catch (err) {
        console.error(`Digest error for ${email}:`, err);
      }
    }

    return new Response(JSON.stringify({
      message: "Daily digest sent",
      admins_emailed: sent,
      stats: { newUsers, newShipments, delivered, cancelled, newMissions, completedMissions, revenue, commission, newDisputes, openDisputes, fraudDetected },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Daily digest error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
