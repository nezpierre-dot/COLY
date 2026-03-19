import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const callerId = user.id;

    const { item_id, item_type } = await req.json();
    if (!item_id || !item_type) {
      return new Response(JSON.stringify({ error: "Missing item_id or item_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get item data from DB (don't trust client-supplied product_name or demandeur_id)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let demandeurId: string | null = null;
    let productName = "votre produit";

    if (item_type === "needit_mission") {
      const { data } = await adminClient.from("needit_missions").select("user_id, voyageur_id, product_name").eq("id", item_id).maybeSingle();
      if (!data) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify caller is the assigned voyageur
      if (data.voyageur_id !== callerId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      demandeurId = data.user_id;
      productName = data.product_name || "votre produit";
    } else if (item_type === "shipment") {
      const { data } = await adminClient.from("shipments").select("user_id, voyageur_id, departure_city, arrival_city").eq("id", item_id).maybeSingle();
      if (!data) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (data.voyageur_id !== callerId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      demandeurId = data.user_id;
      productName = `votre colis ${data.departure_city || ""} → ${data.arrival_city}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid item_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!demandeurId) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await adminClient.auth.admin.getUserById(demandeurId);
    const email = userData?.user?.email;

    if (!email) {
      console.warn("No email found for demandeur", demandeurId);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
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

    // Sanitize for HTML embedding
    const productLabel = escapeHtml(productName);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #0D84FF, #30D158); border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px;">🧾 Preuve d'achat reçue</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 12px; color: #1a1a1a; font-size: 15px;">
            Bonne nouvelle ! Le voyageur a envoyé une <strong>preuve d'achat</strong> pour <strong>${productLabel}</strong>.
          </p>
          <p style="margin: 0; color: #555; font-size: 14px;">
            📸 Photo du produit et ticket de caisse disponibles dans votre conversation.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="https://we-app-you.lovable.app/conversations" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Voir dans le chat
          </a>
        </div>
        <p style="color: #999; font-size: 11px; text-align: center; margin-top: 24px;">Nidit Transport collaboratif</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nidit <noreply@nidit.app>",
        to: [email],
        subject: `🧾 Preuve d'achat reçue pour ${productName}`,
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
    console.error("notify-proof error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
