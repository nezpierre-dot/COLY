import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Popular countries shown at the top of country selects */
export const POPULAR_COUNTRIES = [
  "France", "Senegal", "Ivory Coast", "Mali", "Cameroon",
  "Guinea", "Congo (Kinshasa)", "Morocco", "Algeria", "Tunisia",
  "Belgium", "Germany", "United States", "Canada", "United Kingdom",
];

/** A recent city with its associated country */
export type RecentCity = { city: string; country: string };

/**
 * Returns user's recently used countries and cities from voyages + shipments.
 * Cities are returned with their country so consumers can filter by selected country.
 */
export function useRecentLocations() {
  const { user } = useAuth();
  const [recentCountries, setRecentCountries] = useState<string[]>([]);
  const [recentCitiesAll, setRecentCitiesAll] = useState<RecentCity[]>([]);

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
      const cityMap = new Map<string, string>(); // city -> country

      voyages?.forEach((v) => {
        if (v.departure_country) countries.add(v.departure_country);
        if (v.arrival_country) countries.add(v.arrival_country);
        if (v.departure_city && v.departure_country) cityMap.set(v.departure_city, v.departure_country);
        if (v.arrival_city && v.arrival_country) cityMap.set(v.arrival_city, v.arrival_country);
      });
      shipments?.forEach((s) => {
        if (s.arrival_country) countries.add(s.arrival_country);
        if (s.arrival_city && s.arrival_country) cityMap.set(s.arrival_city, s.arrival_country);
        // departure_city doesn't have a country column in shipments, skip
      });

      setRecentCountries(Array.from(countries));
      setRecentCitiesAll(
        Array.from(cityMap.entries()).map(([city, country]) => ({ city, country }))
      );
    };

    fetchRecent();
  }, [user]);

  /** Get recent cities filtered for a specific country */
  const getRecentCitiesForCountry = (country: string): string[] => {
    if (!country) return [];
    return recentCitiesAll
      .filter((rc) => rc.country === country)
      .map((rc) => rc.city);
  };

  // Backward compat: flat list of all recent cities
  const recentCities = recentCitiesAll.map((rc) => rc.city);

  return { recentCountries, recentCities, getRecentCitiesForCountry };
}
