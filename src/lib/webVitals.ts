/**
 * Web Vitals collection.
 * Sends LCP, CLS, INP, FCP, TTFB to the Supabase `web_vitals` table
 * via the `track-web-vitals` edge function.
 */
import type { Metric } from "web-vitals";

const SAMPLE_RATE = 1.0;
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-web-vitals`;

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
};

const getConnectionType = (): string | undefined => {
  const conn = (navigator as any).connection;
  return conn?.effectiveType ?? undefined;
};

let sessionId = sessionStorage.getItem("wv-session-id");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem("wv-session-id", sessionId);
}

const send = (metric: Metric) => {
  if (Math.random() > SAMPLE_RATE) return;

  const body = JSON.stringify({
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating,
    metric_id: metric.id,
    navigation_type: metric.navigationType,
    page_url: window.location.pathname,
    user_agent: navigator.userAgent,
    device_type: getDeviceType(),
    connection_type: getConnectionType(),
    session_id: sessionId,
  });

  // Prefer sendBeacon on page hide; fall back to fetch keepalive
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(ENDPOINT, blob);
  } else {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — telemetry must never break the app */
    });
  }
};

export const initWebVitals = () => {
  // Skip in Lovable preview / iframe to avoid noisy data
  const isPreview =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");
  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }
  if (isPreview || isInIframe) return;

  // Dynamic import: web-vitals lives in its own chunk, never blocks first paint
  import("web-vitals")
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS(send);
      onINP(send);
      onLCP(send);
      onFCP(send);
      onTTFB(send);
    })
    .catch(() => {
      /* web-vitals failed to load — non-blocking */
    });
};
