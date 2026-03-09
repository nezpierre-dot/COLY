import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StatusChangePayload {
  item_id: string;
  item_type: "shipment" | "needit_mission";
  new_status: "picked_up" | "in_transit" | "delivered" | "completed";
}

const statusConfig: Record<string, { emoji: string; title: string; description: (label: string) => string; gradient: string }> = {
  picked_up: {
    emoji: "📦",
    title: "Colis récupéré",
    description: (label) => `Le voyageur a récupéré <strong>${label}</strong>. Il est maintenant en sa possession.`,
    gradient: "linear-gradient(135deg, #0D84FF, #5856D6)",
  },
  in_transit: {
    emoji: "🚀",
    title: "En transit",
    description: (label) => `<strong>${label}</strong> est en route vers vous ! Le voyageur est en chemin.`,
    gradient: "linear-gradient(135deg, #FF9500, #FF6B00)",
  },
  delivered: {
    emoji: "✅",
    title: "Livré avec succès",
    description: (label) => `<strong>${label}</strong> a été livré avec succès ! N'oubliez pas de noter le voyageur.`,
    gradient: "linear-gradient(135deg, #30D158, #00C853)",
  },
  completed: {
    emoji: "✅",
    title: "Mission terminée",
    description: (label) => `<strong>${label}</strong> a été livré avec succès ! N'oubliez pas de noter le voyageur.`,
    gradient: "linear-gradient(135deg, #30D158, #00C853)",
  },
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

    // Verify the caller is authenticated
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item_id, item_type, new_status } = (await req.json()) as StatusChangePayload;
    if (!item_id || !item_type || !new_status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = statusConfig[new_status];
    if (!config) {
      return new Response(JSON.stringify({ error: "Unknown status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get item owner and label
    let ownerId: string | null = null;
    let itemLabel = "votre colis";
    let detailPath = "";

    if (item_type === "shipment") {
      const { data } = await adminClient.from("shipments").select("user_id, departure_city, arrival_city, arrival_country").eq("id", item_id).maybeSingle();
      if (data) {
        ownerId = data.user_id;
        itemLabel = `votre colis ${data.departure_city || ""} → ${data.arrival_city}`;
        detailPath = `/shipment/${item_id}`;
      }
    } else {
      const { data } = await adminClient.from("needit_missions").select("user_id, product_name").eq("id", item_id).maybeSingle();
      if (data) {
        ownerId = data.user_id;
        itemLabel = data.product_name || "votre produit";
        detailPath = `/needit-mission/${item_id}`;
      }
    }

    if (!ownerId) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "item_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner email
    const { data: userData } = await adminClient.auth.admin.getUserById(ownerId);
    const email = userData?.user?.email;

    if (!email) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deepLink = `https://we-app-you.lovable.app${detailPath}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: ${config.gradient}; border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px;">${config.emoji} ${config.title}</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 15px;">
            ${config.description(itemLabel)}
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${deepLink}" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Voir le détail
          </a>
        </div>
        <p style="color: #999; font-size: 11px; text-align: center; margin-top: 24px;">Nidit — Transport collaboratif</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WeApp You <noreply@weappyou.com>",
        to: [email],
        subject: `${config.emoji} ${config.title} — ${itemLabel}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(`Resend error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("notify-status-change error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
