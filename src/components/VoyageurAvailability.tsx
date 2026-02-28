import { useEffect, useState } from "react";
import { Users, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VoyageurAvailabilityProps {
  country: string;
  city?: string | null;
  /** compact = inline badge, full = card with suggestion */
  variant?: "compact" | "full";
}

/**
 * Shows how many active voyageurs are heading to a destination.
 * Green if >0, orange if 0 with a suggestion to broaden dates.
 */
const VoyageurAvailability = ({ country, city, variant = "compact" }: VoyageurAvailabilityProps) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!country) return;
    const load = async () => {
      const { data, error } = await supabase.rpc("count_voyageurs_for_destination", {
        _country: country,
        _city: city || null,
      });
      if (!error && data !== null) setCount(data);
    };
    load();
  }, [country, city]);

  if (count === null) return null;

  const hasVoyageurs = count > 0;

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          hasVoyageurs
            ? "bg-green-500/15 text-green-600 dark:text-green-400"
            : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        }`}
      >
        <Users size={10} />
        {hasVoyageurs
          ? `${count} voyageur${count > 1 ? "s" : ""} dispo`
          : "0 voyageur"}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs ${
        hasVoyageurs
          ? "bg-green-500/10 border border-green-500/20"
          : "bg-orange-500/10 border border-orange-500/20"
      }`}
    >
      <Users
        size={14}
        className={hasVoyageurs ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold ${
            hasVoyageurs ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
          }`}
        >
          {hasVoyageurs
            ? `${count} voyageur${count > 1 ? "s" : ""} potentiel${count > 1 ? "s" : ""} sur cet axe`
            : "Aucun voyageur sur cet axe actuellement"}
        </p>
        {!hasVoyageurs && (
          <p className="text-orange-600/70 dark:text-orange-400/70 mt-0.5 flex items-center gap-1">
            <CalendarPlus size={10} />
            Essayez d'élargir les dates ou la ville
          </p>
        )}
      </div>
    </div>
  );
};

export default VoyageurAvailability;
