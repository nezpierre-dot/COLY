import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MatchingVoyageur {
  voyageur_id: string;
  full_name: string | null;
  avatar_url: string | null;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  transport_method: string;
  max_weight_kg: number | null;
  max_items: number | null;
  average_score: number;
  total_ratings: number;
  voyage_id: string;
}

interface UseMatchingParams {
  destinationCountry: string;
  destinationCity?: string;
  departureDate?: string;
  maxWeightKg?: number;
  enabled?: boolean;
}

export const useMatchingVoyageurs = ({
  destinationCountry,
  destinationCity,
  departureDate,
  maxWeightKg,
  enabled = true,
}: UseMatchingParams) => {
  const [voyageurs, setVoyageurs] = useState<MatchingVoyageur[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !destinationCountry) {
      setVoyageurs([]);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_matching_voyageurs" as any, {
        _destination_country: destinationCountry,
        _destination_city: destinationCity || null,
        _departure_date: departureDate || null,
        _max_weight_kg: maxWeightKg || null,
        _limit: 5,
      });

      if (!error && data) {
        // Exclude self from matching results
        const filtered = (data as MatchingVoyageur[]).filter(
          (v) => v.voyageur_id !== user?.id
        );
        setVoyageurs(filtered);
      } else {
        setVoyageurs([]);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetch, 400);
    return () => clearTimeout(debounce);
  }, [destinationCountry, destinationCity, departureDate, maxWeightKg, enabled, user?.id]);

  return { voyageurs, loading };
};
