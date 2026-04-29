/**
 * Internal client-side error tracking.
 * Sends crashes to the `log-client-error` edge function (which writes to public.client_errors).
 * Throttled locally to avoid spamming the network on rerender loops.
 */
import { supabase } from "@/integrations/supabase/client";

const SEND_THROTTLE_MS = 2000;
const recent = new Map<string, number>();

interface LogPayload {
  message: string;
  stack?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export async function logClientError(payload: LogPayload) {
  try {
    const key = `${payload.message}::${payload.route ?? ""}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < SEND_THROTTLE_MS) return;
    recent.set(key, now);

    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return;

    const url = `https://${projectId}.supabase.co/functions/v1/log-client-error`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: payload.message?.slice(0, 2000) ?? "Unknown error",
        stack: payload.stack?.slice(0, 8000),
        route: payload.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        metadata: payload.metadata ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Never throw from the error logger
  }
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    void logClientError({
      message: event.message || "window.onerror",
      stack: event.error?.stack,
      metadata: {
        type: "window.error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    void logClientError({
      message:
        typeof reason === "string"
          ? reason
          : reason?.message || "Unhandled promise rejection",
      stack: reason?.stack,
      metadata: { type: "unhandledrejection" },
    });
  });
}
