import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, record_id } = await req.json();

    if (type === "voyage") {
      // A new voyage was created — find matching pending shipments & needit missions
      const { data: voyage } = await supabase
        .from("voyages")
        .select("*")
        .eq("id", record_id)
        .single();

      if (!voyage) throw new Error("Voyage not found");

      // Match shipments by destination
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

      // Match needit missions by destination
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
      const demandeurIds = new Set<string>();

      for (const s of matchedShipments) {
        demandeurIds.add(s.user_id);
        // Notify demandeur
        notifications.push({
          user_id: s.user_id,
          title: "🎯 Match trouvé !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut transporter votre colis.`,
          type: "match",
        });
      }

      for (const m of matchedMissions) {
        demandeurIds.add(m.user_id);
        notifications.push({
          user_id: m.user_id,
          title: "🎯 Match NeedIt !",
          message: `Un voyageur se rend à ${voyage.arrival_city}, ${voyage.arrival_country} et peut réaliser votre mission.`,
          type: "match",
        });
      }

      // Notify voyageur if any matches found
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
      // A new shipment or mission was created — find matching voyages
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
        destination_country = mission.country;
        destination_city = mission.city || "";
        demandeur_id = mission.user_id;
      }

      // Find matching active voyages
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
        // Notify the demandeur
        notifications.push({
          user_id: demandeur_id,
          title: "🎯 Match trouvé !",
          message: `${matchedVoyages.length} voyageur(s) se rend(ent) vers ${destination_city || destination_country}. Votre demande a des correspondances !`,
          type: "match",
        });

        // Notify each matching voyageur
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
