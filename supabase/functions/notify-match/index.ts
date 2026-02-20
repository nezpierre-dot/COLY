import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { type, record_id } = await req.json();

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

      const notifications: any[] = [];

      for (const s of matchedShipments) {
        notifications.push({
          user_id: s.user_id,
          title: "🎯 Match trouvé !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut transporter votre colis.`,
          type: "match",
        });
      }

      for (const m of matchedMissions) {
        notifications.push({
          user_id: m.user_id,
          title: "🎯 Match NeedIt !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut réaliser votre mission.`,
          type: "match",
        });
      }

      if (matchedShipments.length > 0 || matchedMissions.length > 0) {
        const total = matchedShipments.length + matchedMissions.length;
        notifications.push({
          user_id: voyage.user_id,
          title: "🎯 Nouveaux matchs !",
          message: `${total} demande(s) correspondent à votre trajet vers ${voyage.arrival_city}, ${voyage.arrival_country}.`,
          type: "match",
        });
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

      const notifications: any[] = [];

      if (matchedVoyages.length > 0) {
        notifications.push({
          user_id: demandeur_id,
          title: "🎯 Match trouvé !",
          message: `${matchedVoyages.length} voyageur(s) se rend(ent) vers ${destination_city || destination_country}. Votre demande a des correspondances !`,
          type: "match",
        });

        for (const v of matchedVoyages) {
          notifications.push({
            user_id: v.user_id,
            title: "🎯 Nouvelle demande match !",
            message: `Une nouvelle demande correspond à votre trajet vers ${v.arrival_city}, ${v.arrival_country}.`,
            type: "match",
          });
        }
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
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
