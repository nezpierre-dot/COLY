import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_NOTIFICATIONS_PER_CALL = 50;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_CALLS = 5;

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

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting: check recent notifications created by this user
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentNotifCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "match")
      .gte("created_at", rateLimitCutoff);

    // Simple rate limit based on recent match notifications globally from this endpoint
    // A more precise approach would use a dedicated log table, but this is a reasonable heuristic
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

    // Parse and validate input
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

    if (type === "voyage") {
      const { data: voyage } = await supabase
        .from("voyages")
        .select("*")
        .eq("id", record_id)
        .single();

      if (!voyage) throw new Error("Voyage not found");

      // Verify the caller owns this voyage
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
        const cityMatch =
          !s.arrival_city ||
          s.arrival_city.toLowerCase() === voyage.arrival_city.toLowerCase();
        return cityMatch;
      });

      const { data: missions } = await supabase
        .from("needit_missions")
        .select("id, user_id, city, country")
        .eq("status", "pending")
        .ilike("country", voyage.arrival_country);

      const matchedMissions = (missions || []).filter((m) => {
        const cityMatch =
          !m.city ||
          m.city.toLowerCase() === voyage.arrival_city.toLowerCase();
        return cityMatch;
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

      // Cap notifications to prevent abuse
      if (notifications.length > MAX_NOTIFICATIONS_PER_CALL) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_CALL);
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      return new Response(
        JSON.stringify({ matched: notifications.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        // Verify caller owns this shipment
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
        // Verify caller owns this mission
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
        const cityMatch =
          !destination_city ||
          v.arrival_city.toLowerCase() === destination_city.toLowerCase();
        return cityMatch;
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

      // Cap notifications to prevent abuse
      if (notifications.length > MAX_NOTIFICATIONS_PER_CALL) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_CALL);
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      return new Response(
        JSON.stringify({ matched: notifications.length }),
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
