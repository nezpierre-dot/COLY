/**
 * Lightweight product analytics helper.
 *
 * - Inserts events into `analytics_events` (RLS: only own rows).
 * - Fire-and-forget : never blocks the UI; failures are silently ignored.
 * - Batched via a small queue (flushes after 1.5s of inactivity or 10 events).
 * - Includes platform + truncated user agent for segmentation.
 *
 * Usage:
 *   trackEvent("hub_click", "navigation", { hub: "wallet" });
 *   trackEvent("checklist_step_click", "onboarding", { step: "kyc" });
 */
import { supabase } from "@/integrations/supabase/client";

type EventCategory = "navigation" | "onboarding" | "engagement" | "conversion" | "other";

interface QueuedEvent {
  event_name: string;
  category: EventCategory;
  properties: Record<string, unknown>;
  user_id: string | null;
  platform: string;
  user_agent: string;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_BATCH = 10;
const FLUSH_DELAY_MS = 1500;

function getPlatform(): string {
  if (typeof window === "undefined") return "ssr";
  // @ts-expect-error legacy iOS detection
  const isStandalone = window.navigator.standalone || window.matchMedia?.("(display-mode: standalone)")?.matches;
  if (isStandalone) return "pwa";
  return "web";
}

function truncate(s: string, n = 200): string {
  return s.length <= n ? s : s.slice(0, n);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    // Insert in a single round-trip
    await supabase.from("analytics_events").insert(batch as any);
  } catch {
    // Silent: never break UX for analytics
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

/**
 * Track a product event. Fire-and-forget (does not return a promise to avoid awaits in handlers).
 */
export function trackEvent(
  event_name: string,
  category: EventCategory = "other",
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  // Best-effort: read user from a cached supabase session if available
  // (we rely on RLS to bind to auth.uid() server-side)
  const userId = (window as any).__nidit_user_id__ ?? null;
  queue.push({
    event_name,
    category,
    properties,
    user_id: userId,
    platform: getPlatform(),
    user_agent: truncate(window.navigator.userAgent),
  });
  if (queue.length >= MAX_BATCH) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    void flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Should be called once after auth is ready, so events get their user_id stamped.
 * The RLS policy enforces user_id = auth.uid() on insert, so spoofing is blocked.
 */
export function setAnalyticsUser(userId: string | null) {
  if (typeof window === "undefined") return;
  (window as any).__nidit_user_id__ = userId;
}

// Flush on page hide for last events
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
