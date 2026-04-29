/**
 * Notification i18n bridge.
 *
 * The `notifications` table now carries two new columns:
 *   - `i18n_key`     (text, nullable)   — e.g. "notif.match_found"
 *   - `i18n_params`  (jsonb, default {})— e.g. { city: "Paris", amount: "12,50 €" }
 *
 * When `i18n_key` is set, the client renders `{key}.title` and `{key}.message`
 * via the current i18n dictionary, falling back to the legacy `title`/`message`
 * columns if a key/translation is missing. This is fully backwards compatible:
 * existing rows with only `title`/`message` (in French) keep rendering as-is.
 *
 * Future server-side inserts (edge functions, DB triggers) should write:
 *   {
 *     user_id,
 *     title:    fallback FR string,
 *     message:  fallback FR string,
 *     type:     "match:shipment:..." | etc,
 *     i18n_key: "notif.match_found",
 *     i18n_params: { city, voyageur, ... }
 *   }
 *
 * Then the *same* row renders in any language the user later selects.
 */
import i18n from "@/i18n/config";
import type { TFunction } from "i18next";
import { supabase } from "@/integrations/supabase/client";

export interface RawNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  i18n_key?: string | null;
  i18n_params?: Record<string, unknown> | null;
}

export interface DisplayNotification extends RawNotification {
  /** Final text to render (already translated when possible). */
  displayTitle: string;
  displayMessage: string;
}

/**
 * Translate a single notification using the provided `t` function (or the
 * global i18n instance if not provided). Falls back to the stored title/message
 * if no key, or if the key resolves to itself (i18next's default for missing).
 */
export function translateNotif(
  n: RawNotification,
  t: TFunction = i18n.t.bind(i18n) as unknown as TFunction,
): DisplayNotification {
  const key = n.i18n_key?.trim();
  if (!key) {
    return { ...n, displayTitle: n.title, displayMessage: n.message };
  }

  const params = (n.i18n_params ?? {}) as Record<string, unknown>;
  const titleKey = `${key}.title`;
  const msgKey = `${key}.message`;

  const titleResolved = t(titleKey, params) as string;
  const msgResolved = t(msgKey, params) as string;

  // i18next returns the key itself when no translation found — fall back to FR
  const displayTitle = titleResolved && titleResolved !== titleKey ? titleResolved : n.title;
  const displayMessage = msgResolved && msgResolved !== msgKey ? msgResolved : n.message;

  return { ...n, displayTitle, displayMessage };
}

/**
 * Translate a list of notifications.
 */
export function translateNotifList(
  list: RawNotification[],
  t?: TFunction,
): DisplayNotification[] {
  return list.map((n) => translateNotif(n, t));
}

/**
 * Frontend helper to insert a notification with i18n support.
 * Always writes a French fallback into `title`/`message` so rendering works
 * even before clients deploy the i18n-aware UI.
 *
 * Example:
 *   await createNotification({
 *     user_id: ownerId,
 *     i18n_key: "notif.match_found",
 *     i18n_params: { city: "Paris" },
 *     type: `match:shipment:${shipmentId}`,
 *   });
 */
export interface CreateNotificationInput {
  user_id: string;
  i18n_key: string;
  i18n_params?: Record<string, unknown>;
  type: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const { user_id, i18n_key, i18n_params = {}, type } = input;

  // Render French fallback strings using the FR dictionary directly
  const frT = i18n.getFixedT("fr");
  const title = frT(`${i18n_key}.title`, i18n_params) as string;
  const message = frT(`${i18n_key}.message`, i18n_params) as string;

  return supabase.from("notifications").insert({
    user_id,
    title: title && title !== `${i18n_key}.title` ? title : "Notification",
    message: message && message !== `${i18n_key}.message` ? message : "",
    type,
    i18n_key,
    i18n_params: i18n_params as never,
  });
}
