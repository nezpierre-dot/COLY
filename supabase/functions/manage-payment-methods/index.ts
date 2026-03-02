import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { action, payment_method_id, set_default } = await req.json();

    // Get or create Stripe customer
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Handle actions
    if (action === "create-setup-intent") {
      // Create a SetupIntent for adding a new payment method (card or SEPA)
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card", "sepa_debit"],
        usage: "off_session",
      });

      return new Response(
        JSON.stringify({ client_secret: setupIntent.client_secret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "list") {
      // List all payment methods for the customer
      const cards = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
      const sepas = await stripe.paymentMethods.list({
        customer: customerId,
        type: "sepa_debit",
      });

      // Get default payment method
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const defaultPm = customer.invoice_settings?.default_payment_method;

      const methods = [
        ...cards.data.map((pm) => ({
          id: pm.id,
          type: "card" as const,
          brand: pm.card?.brand ?? "",
          last4: pm.card?.last4 ?? "",
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          wallet: pm.card?.wallet?.type ?? null,
          is_default: pm.id === defaultPm,
        })),
        ...sepas.data.map((pm) => ({
          id: pm.id,
          type: "sepa_debit" as const,
          brand: "SEPA",
          last4: pm.sepa_debit?.last4 ?? "",
          bank_code: pm.sepa_debit?.bank_code ?? "",
          country: pm.sepa_debit?.country ?? "",
          is_default: pm.id === defaultPm,
        })),
      ];

      return new Response(
        JSON.stringify({ methods }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "set-default") {
      if (!payment_method_id) throw new Error("payment_method_id required");
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: payment_method_id },
      });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "detach") {
      if (!payment_method_id) throw new Error("payment_method_id required");
      await stripe.paymentMethods.detach(payment_method_id);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
