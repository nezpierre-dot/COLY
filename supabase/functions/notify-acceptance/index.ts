import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voyageurId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { type, item_id } = body;

    if (!type || !item_id) {
      return new Response(JSON.stringify({ error: "Missing type or item_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get voyageur profile
    const { data: voyageurProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", voyageurId)
      .single();

    const voyageurName = voyageurProfile?.full_name || "Un voyageur";

    let ownerId: string | null = null;
    let itemLabel = "";
    let detailPath = "";
    let subject = "";

    if (type === "shipment") {
      const { data: shipment } = await supabase
        .from("shipments")
        .select("user_id, departure_city, arrival_city, arrival_country")
        .eq("id", item_id)
        .single();

      if (!shipment) {
        return new Response(JSON.stringify({ error: "Shipment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      ownerId = shipment.user_id;
      itemLabel = `${shipment.departure_city || "—"} → ${shipment.arrival_city} (${shipment.arrival_country})`;
      detailPath = `/shipment/${item_id}`;
      subject = "✅ Votre colis a été accepté !";
    } else if (type === "needit") {
      const { data: mission } = await supabase
        .from("needit_missions")
        .select("user_id, product_name, country, city")
        .eq("id", item_id)
        .single();

      if (!mission) {
        return new Response(JSON.stringify({ error: "Mission not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      ownerId = mission.user_id;
      itemLabel = mission.product_name || "votre produit";
      detailPath = `/mission/${item_id}`;
      subject = "✅ Votre mission NeedIt a été acceptée !";
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ownerId) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner email
    const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
    const ownerEmail = ownerAuth?.user?.email;

    const appUrl = "https://we-app-you.lovable.app";
    const detailUrl = `${appUrl}${detailPath}`;

    // Send email via Resend if API key is available and owner has email
    if (resendApiKey && ownerEmail) {
      const typeLabel = type === "shipment" ? "colis" : "mission NeedIt";

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #0D84FF, #6366f1); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">✅ ${type === "shipment" ? "Colis accepté" : "Mission acceptée"} !</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonne nouvelle ! <strong>${voyageurName}</strong> a accepté de prendre en charge votre ${typeLabel}.
      </p>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
        <p style="color: #64748b; font-size: 13px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Détails</p>
        <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0;">${itemLabel}</p>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Vous pouvez dès maintenant discuter avec le voyageur via le chat intégré pour coordonner la suite.
      </p>
      <a href="${detailUrl}" style="display: block; text-align: center; background: #0D84FF; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px;">
        Voir les détails →
      </a>
    </div>
    <div style="padding: 16px 24px; background: #f8fafc; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Nidit Livraison collaborative</p>
    </div>
  </div>
</body>
</html>`;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Nidit <noreply@nidit.app>",
            to: [ownerEmail],
            subject,
            html,
          }),
        });

        if (!emailRes.ok) {
          const errData = await emailRes.json();
          console.error("Resend error:", errData);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-acceptance error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
