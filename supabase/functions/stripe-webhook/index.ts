import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[STRIPE-WEBHOOK] Event received: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.type === "wallet_topup" && metadata?.user_id && metadata?.amount) {
        const userId = metadata.user_id;
        const amount = parseFloat(metadata.amount);

        console.log(`[STRIPE-WEBHOOK] Processing wallet topup: user=${userId}, amount=${amount}€`);

        // Get or create wallet
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

        // Credit the wallet
        const newBalance = (wallet.balance || 0) + amount;
        const { error: updateError } = await supabaseAdmin
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", wallet.id);

        if (updateError) throw updateError;

        // Record the transaction
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

        if (txError) console.error("[STRIPE-WEBHOOK] Transaction insert error:", txError);

        // Send notification
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: userId,
            title: "Wallet rechargé 💰",
            message: `Votre wallet a été crédité de ${amount.toFixed(2)}€ via Stripe.`,
            type: "wallet_topup",
          });

        console.log(`[STRIPE-WEBHOOK] Wallet credited successfully: +${amount}€, new balance: ${newBalance}€`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
