import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { photo_url, shipment_id, user_id } = await req.json();
    if (!photo_url || !shipment_id || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to analyze the photo for fraud indicators
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
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Return safe default
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

    // Store result in fraud_checks table
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("fraud_checks").insert({
      user_id,
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
