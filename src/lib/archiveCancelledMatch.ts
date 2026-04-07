import { supabase } from "@/integrations/supabase/client";

interface ArchiveParams {
  item_type: "shipment" | "needit_mission" | "voyage";
  item_id: string;
  user_id: string;
  voyageur_id?: string | null;
  departure_city?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  tarif?: string | null;
  original_status?: string | null;
}

/**
 * Archives a cancelled item that had a match (voyageur_id set) before cancellation.
 * Only archives if there was a voyageur match.
 */
export const archiveCancelledMatch = async (params: ArchiveParams) => {
  // Only archive if there was a match
  if (!params.voyageur_id) return;

  try {
    await supabase.from("cancelled_matches_archive" as any).insert({
      item_type: params.item_type,
      item_id: params.item_id,
      user_id: params.user_id,
      voyageur_id: params.voyageur_id,
      departure_city: params.departure_city ?? null,
      arrival_city: params.arrival_city ?? null,
      arrival_country: params.arrival_country ?? null,
      tarif: params.tarif ?? null,
      original_status: params.original_status ?? null,
    });
  } catch {
    // Non-blocking: archive failure shouldn't prevent cancellation
  }
};
