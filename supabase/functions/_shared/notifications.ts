/**
 * Shared helper for inserting i18n-aware notifications from edge functions.
 *
 * Pattern:
 *   await insertNotification(adminClient, {
 *     user_id,
 *     i18n_key: "notif.match_found",
 *     i18n_params: { city: "Paris" },
 *     type: `match:shipment:${shipmentId}`,
 *     fallback_title: "🎯 Match trouvé !",
 *     fallback_message: `Un voyageur correspond à votre envoi vers Paris.`,
 *   });
 *
 * The `fallback_*` fields are written to the legacy `title`/`message`
 * columns so older clients (or any code that hasn't upgraded to render
 * i18n_key) still see something readable in French.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface NotificationInput {
  user_id: string;
  type: string;
  i18n_key: string;
  i18n_params?: Record<string, unknown>;
  fallback_title: string;
  fallback_message: string;
}

export async function insertNotification(
  client: SupabaseClient,
  input: NotificationInput,
): Promise<{ error: unknown }> {
  const { error } = await client.from("notifications").insert({
    user_id: input.user_id,
    title: input.fallback_title,
    message: input.fallback_message,
    type: input.type,
    i18n_key: input.i18n_key,
    i18n_params: input.i18n_params ?? {},
  });
  return { error };
}

export async function insertNotifications(
  client: SupabaseClient,
  inputs: NotificationInput[],
): Promise<{ error: unknown }> {
  if (inputs.length === 0) return { error: null };
  const rows = inputs.map((i) => ({
    user_id: i.user_id,
    title: i.fallback_title,
    message: i.fallback_message,
    type: i.type,
    i18n_key: i.i18n_key,
    i18n_params: i.i18n_params ?? {},
  }));
  const { error } = await client.from("notifications").insert(rows);
  return { error };
}
