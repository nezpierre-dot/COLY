import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const serviceRoleKey0 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || (token !== cronSecret && token !== serviceRoleKey0)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Run threshold check
    const { data: alerts, error: thresholdError } = await supabase.rpc("admin_check_thresholds");

    if (thresholdError) {
      console.error("Threshold check error:", thresholdError);
      throw new Error(thresholdError.message);
    }

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No threshold alerts", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Persist each alert (avoid duplicates within 1 hour)
    let newAlerts = 0;
    for (const alert of alerts) {
      // Check if same alert type was created in last hour
      const { data: existing } = await supabase
        .from("admin_alerts")
        .select("id")
        .eq("alert_type", alert.type)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .is("resolved_at", null)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("admin_alerts").insert({
        alert_type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata || {},
      });
      newAlerts++;
    }

    // 3. Send email to admins for critical alerts
    const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");

    if (criticalAlerts.length > 0 && resendApiKey) {
      // Get admin emails
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);

        // Get emails from auth.users via admin API
        const adminEmails: string[] = [];
        for (const uid of adminIds) {
          const { data: { user } } = await supabase.auth.admin.getUserById(uid);
          if (user?.email) adminEmails.push(user.email);
        }

        if (adminEmails.length > 0) {
          const alertsHtml = criticalAlerts.map((a: any) =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">
                <span style="background:#dc2626;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">${a.severity.toUpperCase()}</span>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">${a.title}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;">${a.message}</td>
            </tr>`
          ).join("");

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:24px;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:20px;">🚨 Alertes Critiques — Nidit Admin</h1>
                <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div style="background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <p style="color:#374151;margin:0 0 16px;">Des seuils critiques ont été détectés sur la plateforme :</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="background:#f9fafb;">
                      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">SÉVÉRITÉ</th>
                      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">ALERTE</th>
                      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">DÉTAILS</th>
                    </tr>
                  </thead>
                  <tbody>${alertsHtml}</tbody>
                </table>
                <div style="margin-top:20px;padding:12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                  <p style="margin:0;font-size:13px;color:#991b1b;">⚡ Action requise — Connectez-vous au dashboard admin pour résoudre ces alertes.</p>
                </div>
              </div>
            </div>
          `;

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
                  subject: `🚨 [CRITIQUE] ${criticalAlerts.length} alerte(s) — Nidit Admin`,
                  html,
                }),
              });
              const resData = await res.json();
              if (!res.ok) {
                console.error(`Email failed for ${email}:`, resData);
              } else {
                console.log(`Alert email sent to ${email}:`, resData.id);
              }
            } catch (emailErr) {
              console.error(`Email error for ${email}:`, emailErr);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      message: "Threshold check complete",
      total_alerts: alerts.length,
      new_persisted: newAlerts,
      critical_emailed: criticalAlerts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Check thresholds error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
