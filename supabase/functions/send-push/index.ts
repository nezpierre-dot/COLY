// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@nidit.fr";

let vapidReady = false;
let vapidError: string | null = null;
try {
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  } else {
    vapidError = "VAPID keys missing";
  }
} catch (e: any) {
  vapidError = e?.message || "VAPID init failed";
  console.error("VAPID init error:", vapidError);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require service-role or CRON_SECRET — this function should only be called server-to-server
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

  try {
    const body = await req.json();
    const { user_id, title, message, type, notification_id } = body || {};

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!vapidReady) {
      console.warn("send-push skipped:", vapidError);
      return new Response(
        JSON.stringify({ sent: 0, skipped: true, reason: vapidError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      const fallback = await maybeSendEmailFallback(supabase, user_id, type, title, message);
      await logFallback(supabase, {
        user_id, type, notification_id, title, message,
        push_subs_count: 0, push_sent: 0, fallback,
      });
      return new Response(JSON.stringify({ sent: 0, email_fallback: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: message || "",
      type: type || "general",
      notification_id: notification_id || null,
      url: deepLinkFor(type),
    });

    let sent = 0;
    let removed = 0;

    await Promise.all(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent++;
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } catch (err: any) {
          // 410/404 → endpoint expired, remove it
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            removed++;
          }
        }
      }),
    );

    // If no push reached the device (all subs expired/failed), try email fallback for critical events
    let emailFallback: { attempted: boolean; sent?: boolean; reason?: string } = { attempted: false };
    if (sent === 0) {
      emailFallback = await maybeSendEmailFallback(supabase, user_id, type, title, message);
      await logFallback(supabase, {
        user_id, type, notification_id, title, message,
        push_subs_count: subs.length, push_sent: 0, fallback: emailFallback,
      });
    }

    return new Response(JSON.stringify({ sent, removed, email_fallback: emailFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function deepLinkFor(type: string | null | undefined): string {
  if (!type) return "/";
  if (type.startsWith("accepted:shipment:")) return `/colis/${type.split(":")[2]}`;
  if (type.startsWith("accepted:needit:")) return `/needit/${type.split(":")[2]}`;
  if (type.startsWith("pickup:needit:")) return `/needit/${type.split(":")[2]}`;
  if (type.startsWith("pickup:")) return `/colis/${type.split(":")[1]}`;
  if (type.startsWith("mission_status:")) return `/needit/${type.split(":")[1]}`;
  return "/notifications";
}

/**
 * Critical event types that should trigger an email fallback when push delivery fails.
 * Validated by user: Match accepté + Handovers OTP (pickup/delivery) + Rappels départ.
 */
function isCriticalType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (
    type.startsWith("accepted:") ||
    type.startsWith("pickup:") ||
    type.startsWith("delivery:") ||
    type.startsWith("otp:") ||
    type.startsWith("reminder:departure")
  );
}

async function maybeSendEmailFallback(
  supabase: any,
  userId: string,
  type: string | null | undefined,
  title: string,
  message: string | null | undefined,
): Promise<{ attempted: boolean; sent?: boolean; reason?: string }> {
  if (!isCriticalType(type)) return { attempted: false, reason: "not_critical" };

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("critical_email_fallback")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs && prefs.critical_email_fallback === false) {
    return { attempted: true, sent: false, reason: "user_opted_out" };
  }

  const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(userId);
  const email = userRes?.user?.email;
  if (userErr || !email) return { attempted: true, sent: false, reason: "no_email" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const deepLink = `https://nidit.fr${deepLinkFor(type)}`;
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message || "");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#0060CC;color:#fff;font-size:12px;font-weight:600;">Notification Nidit</span>
      </div>
      <h1 style="font-size:20px;margin:0 0 12px;color:#111;">${safeTitle}</h1>
      <p style="font-size:15px;line-height:1.5;color:#374151;margin:0 0 24px;">${safeMessage}</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${deepLink}" style="display:inline-block;padding:12px 24px;background:#0060CC;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Ouvrir Nidit</a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;">
        Tu reçois cet email parce que les notifications push ne sont pas disponibles sur ton appareil
        (iOS &lt; 16.4 ou app non ajoutée à l'écran d'accueil). Pour activer les notifications instantanées,
        ajoute Nidit à ton écran d'accueil depuis Safari.
      </p>
    </div>
  `;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ to: email, subject: `[Nidit] ${title}`, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn("[send-push] email fallback failed", res.status, txt);
      return { attempted: true, sent: false, reason: `http_${res.status}` };
    }
    return { attempted: true, sent: true };
  } catch (e: any) {
    console.error("[send-push] email fallback error", e);
    return { attempted: true, sent: false, reason: "exception" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
