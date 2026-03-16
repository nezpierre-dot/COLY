import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // === Authentication ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // === Input validation ===
    const { photo_url, shipment_id } = await req.json();
    if (!photo_url || !shipment_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Verify caller is involved in the shipment ===
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { data: shipment } = await supabaseService
      .from("shipments")
      .select("user_id, voyageur_id")
      .eq("id", shipment_id)
      .maybeSingle();

    const { data: mission } = await supabaseService
      .from("needit_missions")
      .select("user_id, voyageur_id")
      .eq("id", shipment_id)
      .maybeSingle();

    const item = shipment || mission;
    if (!item || (item.user_id !== userId && item.voyageur_id !== userId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === AI fraud analysis ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fraud detection AI for a parcel delivery service. Analyze the provided photo URL and determine if it appears fraudulent. Look for:
- Stock photos or generic images
- Screenshots of other apps
- Digitally manipulated images
- Images that don't show an actual parcel/package
- Text overlays or watermarks suggesting it's not an original photo

Respond with a JSON object: {"is_fraudulent": boolean, "confidence": number (0-1), "reason": string}
Only respond with the JSON, nothing else.`,
          },
          {
            role: "user",
            content: `Analyze this delivery/pickup proof photo for potential fraud: ${photo_url}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_fraud_analysis",
              description: "Report the fraud analysis result",
              parameters: {
                type: "object",
                properties: {
                  is_fraudulent: { type: "boolean", description: "Whether the photo appears fraudulent" },
                  confidence: { type: "number", description: "Confidence score from 0 to 1" },
                  reason: { type: "string", description: "Brief explanation of the analysis" },
                },
                required: ["is_fraudulent", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_fraud_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({
        result: "safe",
        confidence: 0,
        details: "Unable to analyze - defaulting to safe",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    let analysis = { is_fraudulent: false, confidence: 0, reason: "Analysis complete" };

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        analysis = JSON.parse(toolCall.function.arguments);
      }
    } catch {
      console.error("Failed to parse AI response, defaulting to safe");
    }

    // Store result using service role (user_id from JWT, not from body)
    await supabaseService.from("fraud_checks").insert({
      user_id: userId,
      shipment_id,
      photo_url,
      result: analysis.is_fraudulent ? "fraudulent" : "safe",
      confidence: analysis.confidence,
      details: analysis.reason,
    });

    return new Response(JSON.stringify({
      result: analysis.is_fraudulent ? "fraudulent" : "safe",
      confidence: analysis.confidence,
      details: analysis.reason,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fraud-check error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
