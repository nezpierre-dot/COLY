import { motion } from "framer-motion";
import { Star, MapPin, Calendar, Plane, Train, Car, Bus, Ship, Bike, Loader2, Users, Sparkles, ChevronRight } from "lucide-react";
import { useMatchingVoyageurs } from "../hooks/useMatchingVoyageurs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TrustBadgesDisplay from "@/components/TrustBadgesDisplay";
import WhatsAppShareButton from "@/components/ShareWhatsAppButton";

interface MatchingSuggestionsProps {
  destinationCountry: string;
  destinationCity?: string;
  departureDate?: string;
  /** Approximate weight in kg based on size */
  estimatedWeightKg?: number;
  onSelectVoyageur?: (voyageurId: string, voyageId: string) => void;
  /** Compact mode for embedding in forms */
  compact?: boolean;
}

const transportIcons: Record<string, React.ReactNode> = {
  avion: <Plane size={12} />,
  train: <Train size={12} />,
  voiture: <Car size={12} />,
  bus: <Bus size={12} />,
  bateau: <Ship size={12} />,
  velo: <Bike size={12} />,
};

const getTransportIcon = (method: string) => {
  const key = method?.split(",")[0]?.trim().toLowerCase();
  return transportIcons[key] || <Plane size={12} />;
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
};

const MatchingSuggestions = ({
  destinationCountry,
  destinationCity,
  departureDate,
  estimatedWeightKg,
  onSelectVoyageur,
  compact = false,
}: MatchingSuggestionsProps) => {
  const { voyageurs, loading } = useMatchingVoyageurs({
    destinationCountry,
    destinationCity,
    departureDate,
    maxWeightKg: estimatedWeightKg,
    enabled: !!destinationCountry,
  });

  if (!destinationCountry) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Recherche de voyageurs...</span>
      </div>
    );
  }

  if (voyageurs.length === 0) {
    return (
      <div className="text-center py-4 px-3">
        <Users size={20} className="mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          Aucun voyageur disponible vers {destinationCity || destinationCountry} pour le moment
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles size={14} className="text-accent" />
        <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">
          {voyageurs.length} voyageur{voyageurs.length > 1 ? "s" : ""} disponible{voyageurs.length > 1 ? "s" : ""}
        </h3>
      </div>

      {/* Cards */}
      {voyageurs.map((v, i) => (
        <motion.div
          key={v.voyage_id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-md ${
            compact ? "p-3" : "p-4"
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Avatar className={compact ? "h-9 w-9" : "h-11 w-11"}>
              <AvatarImage src={v.avatar_url || undefined} alt={v.full_name || "Voyageur"} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {(v.full_name || "V").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-foreground truncate ${compact ? "text-sm" : "text-base"}`}>
                  {v.full_name || "Voyageur"}
                </p>
                {Number(v.total_ratings) > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-foreground">{Number(v.average_score).toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">({v.total_ratings})</span>
                  </div>
                )}
              </div>

              {/* Trust badges */}
              {(v as any).trust_badges && (v as any).trust_badges.length > 0 && (
                <div className="mt-1.5">
                  <TrustBadgesDisplay badges={(v as any).trust_badges} compact />
                </div>
              )}

              {/* Route */}
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={10} className="text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {v.departure_city} → {v.arrival_city}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={10} />
                  <span>{formatDate(v.departure_date)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTransportIcon(v.transport_method)}
                  <span className="capitalize">{v.transport_method?.split(",")[0]?.trim()}</span>
                </div>
                {v.max_weight_kg && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    Max {v.max_weight_kg}kg
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            {onSelectVoyageur && (
              <button
                onClick={() => onSelectVoyageur(v.voyageur_id, v.voyage_id)}
                className="shrink-0 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                Choisir <ChevronRight size={12} />
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MatchingSuggestions;
