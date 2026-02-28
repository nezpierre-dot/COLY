import { useEffect, useState } from "react";
import { Users, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VoyageurAvailabilityProps {
  country: string;
  city?: string | null;
  variant?: "compact" | "full";
}

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
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: hasVoyageurs ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
          color: hasVoyageurs ? "#30D158" : "#FF453A",
        }}
      >
        <Users size={10} />
        {hasVoyageurs ? `${count} voyageur${count > 1 ? "s" : ""} dispo` : "0 voyageur"}
      </span>
    );
  }

  if (hasVoyageurs) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs"
        style={{
          background: "rgba(48,209,88,0.1)",
          border: "1px solid rgba(48,209,88,0.2)",
        }}
      >
        <Users size={14} style={{ color: "#30D158" }} />
        <p className="font-semibold" style={{ color: "#30D158" }}>
          {count} voyageur{count > 1 ? "s" : ""} potentiel{count > 1 ? "s" : ""} sur cet axe
        </p>
      </div>
    );
  }

  // No voyageurs – alert box with solid background
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs"
      style={{
        background: "#2A1F1C",
        border: "1px solid #FF453A",
      }}
    >
      <Users size={14} style={{ color: "#FF453A" }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: "#FF453A" }}>
          Aucun voyageur sur cet axe actuellement
        </p>
        <p className="mt-0.5 flex items-center gap-1" style={{ color: "rgba(255,69,58,0.7)" }}>
          <CalendarPlus size={10} />
          Essayez d'élargir les dates ou la ville
        </p>
      </div>
    </div>
  );
};

export default VoyageurAvailability;
