import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const { ticket_id, action, reply } = await req.json();
    if (!ticket_id || !["reply", "close"].includes(action)) {
      throw new Error("Invalid parameters: ticket_id and action (reply|close) required");
    }

    // Get the ticket
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (ticketErr || !ticket) throw new Error("Ticket not found");

    if (action === "reply") {
      if (!reply?.trim()) throw new Error("Reply text is required");

      const safeReply = reply.trim();

      await supabaseAdmin
        .from("support_tickets")
        .update({
          admin_reply: safeReply,
          replied_at: new Date().toISOString(),
          status: "replied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      // In-app notification
      await supabaseAdmin.from("notifications").insert({
        user_id: ticket.user_id,
        title: "Réponse du support 📩",
        message: safeReply.substring(0, 200),
        type: "support_reply:" + ticket_id,
      });

      // Email notification
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id);
        const userEmail = userData?.user?.email;
        if (userEmail) {
          const ticketRef = "SUP-" + ticket_id.substring(0, 8).toUpperCase();
          const escapedReply = safeReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
          const escapedSubject = (ticket.subject || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="background: linear-gradient(135deg, #0D84FF, #34C759); border-radius: 16px; padding: 24px; color: white; text-align: center; margin-bottom: 24px;">
                <h1 style="margin: 0; font-size: 20px;">📩 Réponse du support</h1>
              </div>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <p style="margin: 0 0 4px; color: #666; font-size: 12px; font-weight: 600;">Ticket : ${ticketRef}</p>
                <p style="margin: 0 0 12px; color: #333; font-size: 14px; font-weight: 600;">Sujet : ${escapedSubject}</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 12px 0;" />
                <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.5;">${escapedReply}</p>
              </div>
              <div style="text-align: center;">
                <a href="https://we-app-you.lovable.app/support-contact" style="display: inline-block; background: #0D84FF; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">Voir mes tickets</a>
              </div>
              <p style="color: #999; font-size: 11px; text-align: center; margin-top: 24px;">Nidit — Transport collaboratif</p>
            </div>
          `;
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Nidit Support <noreply@nidit.app>",
              to: [userEmail],
              subject: `📩 Réponse à votre ticket ${ticketRef}`,
              html,
            }),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, action: "reply" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "close") {
      await supabaseAdmin
        .from("support_tickets")
        .update({
          status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket_id);

      await supabaseAdmin.from("notifications").insert({
        user_id: ticket.user_id,
        title: "Ticket résolu ✅",
        message: `Votre ticket "${(ticket.subject || "").substring(0, 60)}" a été clôturé.`,
        type: "support_closed:" + ticket_id,
      });

      return new Response(JSON.stringify({ success: true, action: "close" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("admin-support-ticket error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
