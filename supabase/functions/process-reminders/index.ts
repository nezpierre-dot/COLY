import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WeApp You <noreply@weappyou.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend error [${res.status}]:`, err);
    } else {
      console.log(`Email sent to ${to} for: ${subject}`);
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

function buildReminderEmailHtml(title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:22px;color:#0D84FF;margin:0;">WeApp You</h1>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
          <h2 style="font-size:18px;color:#1e293b;margin:0 0 12px 0;">🔔 ${title}</h2>
          <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">${body}</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://we-app-you.lovable.app/dashboard"
             style="display:inline-block;background:#0D84FF;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Ouvrir l'application
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:32px;">
          © WeApp You — Vous recevez cet e-mail car vous avez activé un rappel.
        </p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require CRON_SECRET
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all pending reminders that are due
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .lte("remind_at", new Date().toISOString())
      .limit(50);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const reminder of reminders) {
      // Get push subscription for user
      const { data: sub } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id)
        .maybeSingle();

      if (sub && sub.endpoint && sub.p256dh && sub.auth) {
        console.log(`Would send push to ${sub.endpoint} for reminder ${reminder.id}`);
      }

      // Always create in-app notification
      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        title: reminder.title,
        message: reminder.body,
        type: `reminder:${reminder.item_type}:${reminder.item_id}`,
      });

      // Send email via Resend
      const { data: userData } = await supabase.auth.admin.getUserById(reminder.user_id);
      if (userData?.user?.email) {
        await sendEmail(
          userData.user.email,
          `Rappel : ${reminder.title}`,
          buildReminderEmailHtml(reminder.title, reminder.body)
        );
      }

      // Mark as sent
      await supabase
        .from("reminders")
        .update({ status: "sent" })
        .eq("id", reminder.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Process reminders error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
