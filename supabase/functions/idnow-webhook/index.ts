import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IDNOW_AUTH_URL = Deno.env.get("IDNOW_AUTH_URL");
if (!IDNOW_AUTH_URL) throw new Error("IDNOW_AUTH_URL not configured");
const IDNOW_CIS_URL = Deno.env.get("IDNOW_CIS_URL");
if (!IDNOW_CIS_URL) throw new Error("IDNOW_CIS_URL not configured");
const IDNOW_CLIENT_ID = Deno.env.get("IDNOW_CLIENT_ID");
if (!IDNOW_CLIENT_ID) throw new Error("IDNOW_CLIENT_ID not configured");
const IDNOW_CLIENT_SECRET = Deno.env.get("IDNOW_CLIENT_SECRET");
if (!IDNOW_CLIENT_SECRET) throw new Error("IDNOW_CLIENT_SECRET not configured");

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
  if (!res.ok) throw new Error(`IDnow auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify shared secret (header or ?secret= query param) to ensure caller is IDnow
  const expectedSecret = Deno.env.get("IDNOW_WEBHOOK_SECRET") ?? "";
  const url = new URL(req.url);
  const provided = req.headers.get("x-webhook-secret")
    || req.headers.get("x-idnow-signature")
    || url.searchParams.get("secret")
    || "";
  if (!expectedSecret || provided !== expectedSecret) {
    console.warn("idnow-webhook: rejected unauthenticated call");
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // IDnow requires HTTP 200 within 3 seconds – respond quickly
  try {
    const body = await req.json();
    console.log("IDnow webhook received:", JSON.stringify(body));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle END_ONBOARDING from SDKWeb
    if (body.type === "END_ONBOARDING" || body.eventType === "END_ONBOARDING") {
      const cisFileUid = body.cisFileUid || body.fileUid || body.data?.cisFileUid;
      if (cisFileUid) {
        // Update kyc_status to "submitted" – analysis is processing
        await supabase
          .from("profiles")
          .update({ kyc_status: "submitted" } as any)
          .eq("kyc_session_id", cisFileUid);
      }
    }

    // Handle FILE_UPDATE_CHECK from CIS (end of analysis)
    if (
      (body.eventKind === "FILE" && body.method === "UPDATE" && body.operation === "CHECK") ||
      body.type === "FILE_UPDATE_CHECK"
    ) {
      const cisFileUid = body.uid || body.fileUid || body.data?.uid;
      if (cisFileUid) {
        try {
          // Fetch the CIS file to get analysis result
          const accessToken = await getAccessToken();
          const fileRes = await fetch(`${IDNOW_CIS_URL}/api/v1/file/${cisFileUid}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (fileRes.ok) {
            const fileData = await fileRes.json();
            const overallResult = fileData.control?.result || fileData.globalStatus;
            const isVerified = overallResult === "OK" || overallResult === "VALID";

            await supabase
              .from("profiles")
              .update({
                kyc_status: isVerified ? "verified" : "rejected",
                kyc_result: fileData,
              } as any)
              .eq("kyc_session_id", cisFileUid);
          }
        } catch (analysisErr) {
          console.error("Error fetching CIS analysis:", analysisErr);
        }
      }
    }

    // Must respond 200 quickly
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("idnow-webhook error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
