import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IDNOW_AUTH_URL = Deno.env.get("IDNOW_AUTH_URL");
if (!IDNOW_AUTH_URL) throw new Error("IDNOW_AUTH_URL not configured");
const IDNOW_SDKWEB_URL = Deno.env.get("IDNOW_SDKWEB_URL");
if (!IDNOW_SDKWEB_URL) throw new Error("IDNOW_SDKWEB_URL not configured");
const IDNOW_CLIENT_ID = Deno.env.get("IDNOW_CLIENT_ID");
if (!IDNOW_CLIENT_ID) throw new Error("IDNOW_CLIENT_ID not configured");
const IDNOW_CLIENT_SECRET = Deno.env.get("IDNOW_CLIENT_SECRET");
if (!IDNOW_CLIENT_SECRET) throw new Error("IDNOW_CLIENT_SECRET not configured");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getAccessToken(): Promise<string> {
  const res = await fetch(IDNOW_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: IDNOW_CLIENT_ID,
      client_secret: IDNOW_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IDnow auth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { redirectUrl } = await req.json();

    // 1. Get IDnow access token
    const accessToken = await getAccessToken();

    // 2. Create onboarding session
    const webhookBaseUrl = `${SUPABASE_URL}/functions/v1/idnow-webhook`;

    const sendlinkBody = {
      documentsToCapture: ["ID", "LIVENESS"],
      cisFileUid: `coly-${user.id}-${Date.now()}`,
      fileCheckWait: false,
      redirectionData: {
        successRedirectUrl: redirectUrl || `${req.headers.get("origin")}/kyc?status=success`,
        failureRedirectUrl: redirectUrl || `${req.headers.get("origin")}/kyc?status=failure`,
        abortRedirectUrl: redirectUrl || `${req.headers.get("origin")}/kyc?status=abort`,
      },
      endpointsToNotify: ["coly-webhook"],
    };

    const sendlinkRes = await fetch(`${IDNOW_SDKWEB_URL}/onboarding/sendlink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendlinkBody),
    });

    if (!sendlinkRes.ok) {
      const errText = await sendlinkRes.text();
      throw new Error(`IDnow sendlink failed (${sendlinkRes.status}): ${errText}`);
    }

    const sendlinkData = await sendlinkRes.json();
    const onboardingUrl = sendlinkData.url || sendlinkData.onboardingUrl;
    const cisFileUid = sendlinkBody.cisFileUid;

    // 3. Store session info in profiles
    await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
        kyc_session_id: cisFileUid,
      } as any)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ onboardingUrl, cisFileUid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("idnow-kyc error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
