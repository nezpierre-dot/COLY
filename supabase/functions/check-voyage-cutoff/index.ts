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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find active voyages where remaining time is < 2x cutoff but > 0
    // and no "cutoff_warning" notification has been sent yet
    const { data: voyages, error: vErr } = await supabase
      .from("voyages")
      .select("id, user_id, departure_city, arrival_city, departure_date, departure_time, cutoff_hours")
      .eq("status", "active")
      .gte("departure_date", new Date().toISOString().split("T")[0]);

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
        // Check if we already sent this notification
        const notifType = `cutoff_warning:${v.id}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", v.user_id)
          .eq("type", notifType)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const hoursLeft = Math.round(remaining / (60 * 60 * 1000));

        await supabase.from("notifications").insert({
          user_id: v.user_id,
          title: "⏰ Voyage bientôt fermé",
          message: `Votre voyage ${v.departure_city} → ${v.arrival_city} se ferme aux nouveaux matchs dans ~${hoursLeft}h. Modifiez le délai si besoin.`,
          type: notifType,
        });

        notified++;
      }
    }

    return new Response(JSON.stringify({ ok: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
