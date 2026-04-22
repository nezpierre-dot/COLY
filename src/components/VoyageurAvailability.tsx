import { useEffect, useState } from "react";
import { Users, CalendarPlus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface VoyageurAvailabilityProps {
  country: string;
  city?: string | null;
  variant?: "compact" | "full";
  onShare?: () => void;
}

const VoyageurAvailability = ({ country, city, variant = "compact", onShare }: VoyageurAvailabilityProps) => {
  const [count, setCount] = useState<number | null>(null);
  const { t } = useTranslation();

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
          background: hasVoyageurs ? "rgba(48,209,88,0.15)" : "hsl(var(--muted))",
          color: hasVoyageurs ? "#30D158" : "hsl(var(--muted-foreground))",
        }}
      >
        <Users size={10} />
        {hasVoyageurs
          ? (count > 1 ? t("availability.countPlural") : t("availability.countSingle")).replace("{count}", String(count))
          : t("availability.zeroCompact")}
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
          {(count > 1 ? t("availability.potentialPlural") : t("availability.potentialSingle")).replace("{count}", String(count))}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs bg-muted/60 border border-border"
      >
        <Users size={14} className="text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground/80">
            {t("availability.none")}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
            <CalendarPlus size={10} />
            {t("availability.hint")}
          </p>
        </div>
      </div>
      {onShare && (
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary via-primary to-secondary shadow-soft hover:shadow-elevated transition-all"
        >
          <Share2 size={14} /> Partager mission
        </button>
      )}
    </div>
  );
};

export default VoyageurAvailability;
