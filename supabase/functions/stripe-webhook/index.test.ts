// Deno test for stripe-webhook signature verification.
// Run with: deno test --allow-net --allow-env supabase/functions/stripe-webhook/index.test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const PROJECT_ID = Deno.env.get("VITE_SUPABASE_PROJECT_ID");
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/stripe-webhook`;

Deno.test("rejects request with missing stripe-signature header (400)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ id: "evt_test", type: "ping" }),
  });
  const text = await res.text();
  assertEquals(res.status, 400, `expected 400, got ${res.status}: ${text}`);
});

Deno.test("rejects request with invalid stripe signature (400)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "stripe-signature": "t=0,v1=deadbeef",
    },
    body: JSON.stringify({ id: "evt_test_invalid", type: "ping" }),
  });
  const text = await res.text();
  assertEquals(res.status, 400, `expected 400, got ${res.status}: ${text}`);
});
