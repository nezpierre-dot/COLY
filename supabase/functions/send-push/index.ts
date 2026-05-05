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

    return new Response(JSON.stringify({ sent, removed }), {
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
