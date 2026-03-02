import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        // Send web push notification via web-push
        // For now, create an in-app notification as fallback
        console.log(`Would send push to ${sub.endpoint} for reminder ${reminder.id}`);
      }

      // Always create in-app notification
      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        title: reminder.title,
        message: reminder.body,
        type: "reminder",
      });

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
