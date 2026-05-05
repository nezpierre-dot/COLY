import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function expectedToken(userId: string): Promise<string> {
  const secret = Deno.env.get("UNSUBSCRIBE_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(userId));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);

    // GET: check unsubscribe status by user_id (HMAC token required)
    if (req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      const token = url.searchParams.get("token") ?? "";
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const expected = await expectedToken(userId);
      if (!safeEqual(token, expected)) {
        return new Response("Lien invalide ou expiré.", {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const { data } = await supabase
        .from("email_preferences")
        .select("match_emails")
        .eq("user_id", userId)
        .single();

      // If no preference exists, default to subscribed
      const subscribed = data?.match_emails ?? true;

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Préférences email - Nidit</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9fafb; display: flex; justify-content: center; padding: 40px 20px; }
          .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 450px; width: 100%; border: 1px solid #e5e7eb; text-align: center; }
          h1 { font-size: 20px; color: #111827; margin: 0 0 16px; }
          p { font-size: 14px; color: #374151; line-height: 1.6; }
          .btn { display: inline-block; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; text-decoration: none; cursor: pointer; border: none; color: #fff; margin-top: 16px; }
          .btn-unsub { background: #ef4444; }
          .btn-resub { background: #7c3aed; }
          .status { font-size: 13px; color: #9ca3af; margin-top: 20px; }
        </style>
        </head>
        <body>
          <div class="card">
            <h1>📧 Préférences email</h1>
            ${subscribed
              ? `<p>Vous recevez actuellement les emails de matching Nidit.</p>
                 <form method="POST">
                   <input type="hidden" name="user_id" value="${userId}">
                   <input type="hidden" name="token" value="${token}">
                   <input type="hidden" name="action" value="unsubscribe">
                   <button type="submit" class="btn btn-unsub">Se désinscrire</button>
                 </form>`
              : `<p>Vous êtes désabonné(e) des emails de matching.</p>
                 <form method="POST">
                   <input type="hidden" name="user_id" value="${userId}">
                   <input type="hidden" name="token" value="${token}">
                   <input type="hidden" name="action" value="resubscribe">
                   <button type="submit" class="btn btn-resub">Se réabonner</button>
                 </form>`
            }
            <p class="status">— L'équipe Nidit</p>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // POST: update preference
    if (req.method === "POST") {
      let userId: string;
      let action: string;

      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        userId = formData.get("user_id") as string;
        action = formData.get("action") as string;
      } else {
        const body = await req.json();
        userId = body.user_id;
        action = body.action;
      }

      if (!userId || !action) {
        return new Response(JSON.stringify({ error: "Missing user_id or action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const matchEmails = action !== "unsubscribe";

      await supabase.from("email_preferences").upsert(
        { user_id: userId, match_emails: matchEmails, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      const message = matchEmails
        ? "✅ Vous êtes réabonné(e) aux emails de matching."
        : "✅ Vous avez été désabonné(e) des emails de matching.";

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Préférences email - Nidit</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9fafb; display: flex; justify-content: center; padding: 40px 20px; }
          .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 450px; width: 100%; border: 1px solid #e5e7eb; text-align: center; }
          h1 { font-size: 20px; color: #111827; margin: 0 0 16px; }
          p { font-size: 14px; color: #374151; line-height: 1.6; }
          .status { font-size: 13px; color: #9ca3af; margin-top: 20px; }
        </style>
        </head>
        <body>
          <div class="card">
            <h1>${message}</h1>
            <p class="status">— L'équipe Nidit</p>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("Email unsubscribe error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
