import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Popular countries shown at the top of country selects */
export const POPULAR_COUNTRIES = [
  "France", "Senegal", "Ivory Coast", "Mali", "Cameroon",
  "Guinea", "Congo (Kinshasa)", "Morocco", "Algeria", "Tunisia",
  "Belgium", "Germany", "United States", "Canada", "United Kingdom",
];

/**
 * Returns user's recently used countries and cities from voyages + shipments.
 */
export function useRecentLocations() {
  const { user } = useAuth();
  const [recentCountries, setRecentCountries] = useState<string[]>([]);
  const [recentCities, setRecentCities] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchRecent = async () => {
      const [{ data: voyages }, { data: shipments }] = await Promise.all([
        supabase
          .from("voyages")
          .select("departure_country, departure_city, arrival_country, arrival_city")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("shipments")
          .select("arrival_country, arrival_city, departure_city")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const countries = new Set<string>();
      const cities = new Set<string>();

      voyages?.forEach((v) => {
        if (v.departure_country) countries.add(v.departure_country);
        if (v.arrival_country) countries.add(v.arrival_country);
        if (v.departure_city) cities.add(v.departure_city);
        if (v.arrival_city) cities.add(v.arrival_city);
      });
      shipments?.forEach((s) => {
        if (s.arrival_country) countries.add(s.arrival_country);
        if (s.arrival_city) cities.add(s.arrival_city);
        if (s.departure_city) cities.add(s.departure_city);
      });

      setRecentCountries(Array.from(countries));
      setRecentCities(Array.from(cities));
    };

    fetchRecent();
  }, [user]);

  return { recentCountries, recentCities };
}
