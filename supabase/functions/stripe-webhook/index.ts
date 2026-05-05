import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, message: string, ctx: Record<string, unknown> = {}) {
  const entry = {
    level,
    scope: "stripe-webhook",
    message,
    ts: new Date().toISOString(),
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // 1. Header check (must come before reading the body)
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("warn", "missing_signature_header", { ip: req.headers.get("x-forwarded-for") });
    return jsonResponse(400, { error: "Missing stripe-signature header" });
  }

  // 2. Webhook secret config
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("error", "missing_webhook_secret_env");
    return jsonResponse(500, { error: "Webhook secret not configured" });
  }

  // 3. Read RAW body unmodified (must be the original bytes Stripe signed).
  // We use req.text() before any parsing — do NOT call req.json() first.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    log("error", "raw_body_read_failed", { err: (err as Error).message });
    return jsonResponse(400, { error: "Unable to read request body" });
  }

  // 4. Signature verification
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    log("warn", "invalid_signature", { err: (err as Error).message });
    return jsonResponse(400, { error: "Invalid signature" });
  }

  // 5. Idempotence: skip if event.id was already processed
  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (lookupError) {
      log("error", "idempotence_lookup_failed", { event_id: event.id, err: lookupError.message });
      // Continue: better to risk a replay than to silently drop a real event
    } else if (existing) {
      log("info", "duplicate_event_skipped", { event_id: event.id, event_type: event.type });
      return jsonResponse(200, { received: true, duplicate: true });
    }
  } catch (err) {
    log("error", "idempotence_check_exception", { err: (err as Error).message });
  }

  log("info", "event_received", { event_id: event.id, event_type: event.type });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.type === "wallet_topup" && metadata?.user_id && metadata?.amount) {
        const userId = metadata.user_id;
        const amount = parseFloat(metadata.amount);

        log("info", "wallet_topup_processing", { event_id: event.id, user_id: userId, amount });

        let { data: wallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .select("id, balance")
          .eq("user_id", userId)
          .single();

        if (walletError || !wallet) {
          const { data: newWallet, error: createError } = await supabaseAdmin
            .from("wallets")
            .insert({ user_id: userId, balance: 0 })
            .select("id, balance")
            .single();
          if (createError) throw createError;
          wallet = newWallet;
        }

        const newBalance = (wallet.balance || 0) + amount;
        const { error: updateError } = await supabaseAdmin
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", wallet.id);

        if (updateError) throw updateError;

        const { error: txError } = await supabaseAdmin
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            user_id: userId,
            amount: amount,
            type: "credit",
            description: `Recharge Stripe — ${amount.toFixed(2)}€`,
            reference_type: "stripe_topup",
            reference_id: session.id as any,
          });

        if (txError) log("error", "wallet_transaction_insert_failed", { err: txError.message });

        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: userId,
            title: "Wallet rechargé 💰",
            message: `Votre wallet a été crédité de ${amount.toFixed(2)}€ via Stripe.`,
            type: "wallet_topup",
          });

        log("info", "wallet_topup_credited", {
          event_id: event.id,
          user_id: userId,
          amount,
          new_balance: newBalance,
        });
      }
    }

    // 6. Mark event as processed (idempotence sentinel)
    const { error: insertError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    if (insertError && insertError.code !== "23505") {
      // 23505 = unique_violation (race with concurrent delivery) → fine
      log("error", "idempotence_insert_failed", { event_id: event.id, err: insertError.message });
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    log("error", "handler_exception", {
      event_id: event.id,
      event_type: event.type,
      err: (error as Error).message,
    });
    return jsonResponse(500, { error: (error as Error).message });
  }
});
