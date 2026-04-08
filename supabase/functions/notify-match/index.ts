import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_NOTIFICATIONS_PER_CALL = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 5;
const MAX_EMAILS_PER_CALL = 10;

/** Build unsubscribe URL for a user */
function getUnsubscribeUrl(supabaseUrl: string, userId: string): string {
  return `${supabaseUrl}/functions/v1/email-unsubscribe?user_id=${userId}`;
}

/** Build match email HTML */
function buildMatchEmailHtml(
  userName: string,
  destination: string,
  matchType: "shipment" | "needit" | "voyage",
  unsubscribeUrl: string,
): { subject: string; html: string } {
  let subject: string;
  let bodyText: string;

  if (matchType === "shipment") {
    subject = "🎯 Un voyageur peut transporter votre colis !";
    bodyText = `Un voyageur se rend à <strong>${destination}</strong> et peut transporter votre colis.`;
  } else if (matchType === "needit") {
    subject = "🎯 Un voyageur peut réaliser votre mission NeedIt !";
    bodyText = `Un voyageur se rend à <strong>${destination}</strong> et peut réaliser votre mission.`;
  } else {
    subject = "🎯 Un nouveau colis correspond à votre trajet !";
    bodyText = `Un nouveau colis à destination de <strong>${destination}</strong> correspond à votre trajet.`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
      <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
        <h1 style="font-size:20px;color:#111827;margin:0 0 16px;">🎯 Match trouvé !</h1>
        <p style="font-size:14px;color:#374151;line-height:1.6;">
          Bonjour${userName ? ` ${userName}` : ""},
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;">
          ${bodyText}
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;">
          Connectez-vous pour voir les détails et accepter le match.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://we-app-you.lovable.app/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
            Voir le match
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;">
          Vous recevez cet email car vous utilisez Nidit.<br/>
          <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Se désinscrire des emails de matching</a>
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/** Send a match email via the send-email edge function */
async function sendMatchEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  to: string,
  userName: string,
  destination: string,
  matchType: "shipment" | "needit" | "voyage",
  userId: string,
) {
  const unsubscribeUrl = getUnsubscribeUrl(supabaseUrl, userId);
  const { subject, html } = buildMatchEmailHtml(userName, destination, matchType, unsubscribeUrl);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`Email send failed for ${to}:`, body);
    }
  } catch (err) {
    console.error(`Email send error for ${to}:`, err);
  }
}

/** Collect unique user IDs that should receive match emails */
function collectEmailRecipients(
  items: { user_id: string }[],
  matchType: "shipment" | "needit" | "voyage",
  destination: string,
): { userId: string; matchType: "shipment" | "needit" | "voyage"; destination: string }[] {
  const seen = new Set<string>();
  const recipients: { userId: string; matchType: "shipment" | "needit" | "voyage"; destination: string }[] = [];
  for (const item of items) {
    if (!seen.has(item.user_id)) {
      seen.add(item.user_id);
      recipients.push({ userId: item.user_id, matchType, destination });
    }
  }
  return recipients;
}

/** Look up emails for user IDs via auth.users (service role) and check opt-out */
async function getUserEmails(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, { email: string; name: string }>> {
  const map = new Map<string, { email: string; name: string }>();

  // Check email preferences (opt-outs)
  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("user_id, match_emails")
    .in("user_id", userIds);

  const optedOut = new Set<string>();
  for (const p of prefs || []) {
    if (!p.match_emails) optedOut.add(p.user_id);
  }

  // Get profiles for names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  // Get emails from auth.users via admin API
  for (const uid of userIds) {
    if (optedOut.has(uid)) continue; // Skip opted-out users
    try {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data?.user?.email) {
        const profile = profiles?.find((p: any) => p.user_id === uid);
        map.set(uid, {
          email: data.user.email,
          name: profile?.full_name || "",
        });
      }
    } catch {
      // Skip if user not found
    }
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: recentUserNotifs } = await supabase
      .from("notifications")
      .select("created_at")
      .eq("user_id", userId)
      .eq("type", "match")
      .gte("created_at", rateLimitCutoff)
      .order("created_at", { ascending: false })
      .limit(RATE_LIMIT_MAX_CALLS);

    if (recentUserNotifs && recentUserNotifs.length >= RATE_LIMIT_MAX_CALLS) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, record_id } = body;
    const VALID_TYPES = ["voyage", "shipment", "mission"];
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be voyage, shipment, or mission" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!record_id || !UUID_REGEX.test(record_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid record_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── VOYAGE type: notify matching demandeurs ──
    if (type === "voyage") {
      const { data: voyage } = await supabase
        .from("voyages")
        .select("*")
        .eq("id", record_id)
        .single();

      if (!voyage) throw new Error("Voyage not found");
      if (voyage.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shipments } = await supabase
        .from("shipments")
        .select("id, user_id, arrival_city, arrival_country")
        .eq("status", "pending")
        .ilike("arrival_country", voyage.arrival_country);

      const matchedShipments = (shipments || []).filter((s) => {
        return !s.arrival_city || s.arrival_city.toLowerCase() === voyage.arrival_city.toLowerCase();
      });

      const { data: missions } = await supabase
        .from("needit_missions")
        .select("id, user_id, city, country")
        .eq("status", "pending")
        .ilike("country", voyage.arrival_country);

      const matchedMissions = (missions || []).filter((m) => {
        return !m.city || m.city.toLowerCase() === voyage.arrival_city.toLowerCase();
      });

      let notifications: any[] = [];

      for (const s of matchedShipments) {
        notifications.push({
          user_id: s.user_id,
          title: "🎯 Match trouvé !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut transporter votre colis.`,
          type: `match:shipment:${s.id}`,
        });
      }

      for (const m of matchedMissions) {
        notifications.push({
          user_id: m.user_id,
          title: "🎯 Match NeedIt !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut réaliser votre mission.`,
          type: `match:needit:${m.id}`,
        });
      }

      if (matchedShipments.length > 0 || matchedMissions.length > 0) {
        const total = matchedShipments.length + matchedMissions.length;
        notifications.push({
          user_id: voyage.user_id,
          title: "🎯 Nouveaux matchs !",
          message: `${total} demande(s) correspondent à votre trajet vers ${voyage.arrival_city}, ${voyage.arrival_country}. Cliquez pour voir et accepter.`,
          type: `match:voyage:${record_id}`,
        });
      }

      if (notifications.length > MAX_NOTIFICATIONS_PER_CALL) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_CALL);
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      // ── Send emails to matched demandeurs ──
      const destination = `${voyage.arrival_city}, ${voyage.arrival_country}`;
      const emailRecipients = [
        ...collectEmailRecipients(matchedShipments, "shipment", destination),
        ...collectEmailRecipients(matchedMissions, "needit", destination),
      ].slice(0, MAX_EMAILS_PER_CALL);

      if (emailRecipients.length > 0) {
        const userIds = emailRecipients.map((r) => r.userId);
        const emailMap = await getUserEmails(supabase, userIds);

        const emailPromises = emailRecipients.map((r) => {
          const info = emailMap.get(r.userId);
          if (!info?.email) return Promise.resolve();
          return sendMatchEmail(supabaseUrl, serviceRoleKey, info.email, info.name, r.destination, r.matchType, r.userId);
        });
        await Promise.allSettled(emailPromises);
      }

      return new Response(
        JSON.stringify({ matched: notifications.length, emails_sent: emailRecipients.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SHIPMENT / MISSION type: notify matching voyageurs + send emails ──
    if (type === "shipment" || type === "mission") {
      let destination_country = "";
      let destination_city = "";
      let demandeur_id = "";

      if (type === "shipment") {
        const { data: shipment } = await supabase
          .from("shipments")
          .select("*")
          .eq("id", record_id)
          .single();
        if (!shipment) throw new Error("Shipment not found");
        if (shipment.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        destination_country = shipment.arrival_country;
        destination_city = shipment.arrival_city;
        demandeur_id = shipment.user_id;
      } else {
        const { data: mission } = await supabase
          .from("needit_missions")
          .select("*")
          .eq("id", record_id)
          .single();
        if (!mission) throw new Error("Mission not found");
        if (mission.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        destination_country = mission.country;
        destination_city = mission.city || "";
        demandeur_id = mission.user_id;
      }

      const { data: voyages } = await supabase
        .from("voyages")
        .select("id, user_id, arrival_city, arrival_country, departure_city")
        .eq("status", "active")
        .ilike("arrival_country", destination_country);

      const matchedVoyages = (voyages || []).filter((v) => {
        return !destination_city || v.arrival_city.toLowerCase() === destination_city.toLowerCase();
      });

      let notifications: any[] = [];

      if (matchedVoyages.length > 0) {
        notifications.push({
          user_id: demandeur_id,
          title: "🎯 Match trouvé !",
          message: `${matchedVoyages.length} voyageur(s) se rend(ent) vers ${destination_city || destination_country}. Votre demande a des correspondances !`,
          type: `match:${type === "shipment" ? "shipment" : "needit"}:${record_id}`,
        });

        for (const v of matchedVoyages) {
          notifications.push({
            user_id: v.user_id,
            title: "🎯 Nouvelle demande match !",
            message: `Une nouvelle demande correspond à votre trajet vers ${v.arrival_city}, ${v.arrival_country}.`,
            type: `match:voyage:${v.id}`,
          });
        }
      }

      if (notifications.length > MAX_NOTIFICATIONS_PER_CALL) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_CALL);
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      // ── Send emails to matched voyageurs ──
      let emailsSent = 0;
      if (matchedVoyages.length > 0) {
        const destination = `${destination_city || destination_country}`;
        const emailRecipients = collectEmailRecipients(
          matchedVoyages.map((v) => ({ user_id: v.user_id })),
          "voyage",
          destination,
        ).slice(0, MAX_EMAILS_PER_CALL);

        if (emailRecipients.length > 0) {
          const userIds = emailRecipients.map((r) => r.userId);
          const emailMap = await getUserEmails(supabase, userIds);

          const emailPromises = emailRecipients.map((r) => {
            const info = emailMap.get(r.userId);
            if (!info?.email) return Promise.resolve();
            return sendMatchEmail(supabaseUrl, serviceRoleKey, info.email, info.name, r.destination, "voyage", r.userId);
          });
          await Promise.allSettled(emailPromises);
          emailsSent = emailRecipients.length;
        }
      }

      return new Response(
        JSON.stringify({ matched: notifications.length, emails_sent: emailsSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-match error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
