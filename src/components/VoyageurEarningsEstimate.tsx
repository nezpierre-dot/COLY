import { TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { calculateSuggestedPrice } from "@/lib/priceSuggestion";
import { getCurrencyForCountry } from "@/hooks/useLocaleUnits";

interface VoyageurEarningsEstimateProps {
  departureCountry: string;
  departureCity: string;
  arrivalCountry: string;
  arrivalCity: string;
  departureDate?: string;
}

const COMMISSION = 0.15; // 15% Nidit fee

const VoyageurEarningsEstimate = ({
  departureCountry,
  departureCity,
  arrivalCountry,
  arrivalCity,
  departureDate = "",
}: VoyageurEarningsEstimateProps) => {
  const ready =
    departureCountry && arrivalCountry && departureCity && arrivalCity;

  const data = useMemo(() => {
    if (!ready) return null;
    const isInternational =
      departureCountry.toLowerCase().trim() !==
      arrivalCountry.toLowerCase().trim();

    // Average across S, M, L sizes
    const sizes = ["S", "M", "L"];
    const prices = sizes.map(
      (s) =>
        calculateSuggestedPrice({
          departCountry: departureCountry,
          departCity: departureCity,
          arrCountry: arrivalCountry,
          arrCity: arrivalCity,
          size: s,
          departureDate,
          isInternational,
        }).price
    );
    const avgGross = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minGross = Math.min(...prices);
    const maxGross = Math.max(...prices);

    // Voyageur keeps gross - commission
    const net = (g: number) => Math.round(g * (1 - COMMISSION) * 2) / 2;

    const distanceKm = calculateSuggestedPrice({
      departCountry: departureCountry,
      departCity: departureCity,
      arrCountry: arrivalCountry,
      arrCity: arrivalCity,
      size: "M",
      departureDate,
      isInternational,
    }).distanceKm;

    return {
      avg: net(avgGross),
      min: net(minGross),
      max: net(maxGross),
      distanceKm,
      currency: getCurrencyForCountry(arrivalCountry).symbol,
    };
  }, [
    ready,
    departureCountry,
    departureCity,
    arrivalCountry,
    arrivalCity,
    departureDate,
  ]);

  if (!ready || !data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 via-success/5 to-transparent p-4"
      role="status"
      aria-label="Estimation de gains pour ce trajet"
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-success/10 blur-xl" />
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={11} className="text-success" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-success">
              Gain estimé sur ce trajet
            </p>
          </div>
          <p className="text-2xl font-bold text-foreground leading-tight">
            ~{data.avg.toFixed(0)}
            {data.currency}{" "}
            <span className="text-sm text-muted-foreground font-medium">
              / colis
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Entre <strong className="text-foreground">{data.min.toFixed(0)}{data.currency}</strong> et{" "}
            <strong className="text-foreground">{data.max.toFixed(0)}{data.currency}</strong> selon
            la taille · ~{data.distanceKm} km · net après commission
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VoyageurEarningsEstimate;
