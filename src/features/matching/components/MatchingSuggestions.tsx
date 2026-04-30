import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, Plane, Train, Car, Bus, Ship, Bike, Loader2, Users, Sparkles, ChevronRight, ShieldCheck, Award, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMatchingVoyageurs } from "../hooks/useMatchingVoyageurs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TrustBadgesDisplay from "@/components/TrustBadgesDisplay";
import UserLevelBadge from "@/components/UserLevelBadge";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MatchingSuggestionsProps {
  destinationCountry: string;
  destinationCity?: string;
  departureDate?: string;
  estimatedWeightKg?: number;
  onSelectVoyageur?: (voyageurId: string, voyageId: string) => void;
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

const getTrustLevel = (v: {
  kyc_status: string | null;
  trust_badges: string[] | null;
  average_score: number;
  total_ratings: number;
}): { label: string; color: string; score: number } => {
  let score = 0;
  if (v.kyc_status === "verified") score += 3;
  score += (v.trust_badges?.length || 0);
  if (Number(v.average_score) >= 4.8) score += 2;
  if (Number(v.total_ratings) >= 10) score += 1;

  if (score >= 6) return { label: "Excellent", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", score };
  if (score >= 3) return { label: "Bon", color: "bg-amber-500/15 text-amber-700 border-amber-500/30", score };
  return { label: "Nouveau", color: "bg-muted text-muted-foreground border-border", score };
};

const MatchingSuggestions = ({
  destinationCountry,
  destinationCity,
  departureDate,
  estimatedWeightKg,
  onSelectVoyageur,
  compact = false,
}: MatchingSuggestionsProps) => {
  const [kycOnly, setKycOnly] = useState(false);
  const { voyageurs, loading } = useMatchingVoyageurs({
    destinationCountry,
    destinationCity,
    departureDate,
    maxWeightKg: estimatedWeightKg,
    enabled: !!destinationCountry,
  });
  const nav = useNavigate();

  const filtered = kycOnly ? voyageurs.filter((v) => v.kyc_status === "verified") : voyageurs;

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
      {/* Header + filter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">
            {filtered.length} voyageur{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-600" />
          <Label htmlFor="kyc-filter" className="text-[10px] text-muted-foreground cursor-pointer">
            Vérifiés uniquement
          </Label>
          <Switch
            id="kyc-filter"
            checked={kycOnly}
            onCheckedChange={setKycOnly}
            className="scale-75"
          />
        </div>
      </div>

      {/* Empty after filter */}
      {filtered.length === 0 && kycOnly && (
        <div className="text-center py-3 px-3">
          <ShieldCheck size={18} className="mx-auto text-muted-foreground/50 mb-1.5" />
          <p className="text-xs text-muted-foreground">
            Aucun voyageur vérifié disponible. Désactivez le filtre pour voir tous les résultats.
          </p>
        </div>
      )}

      {/* Cards */}
      {filtered.map((v, i) => {
        const trust = getTrustLevel(v);
        return (
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
                <AvatarImage src={v.avatar_url || undefined} alt="Voyageur Nidit" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {v.full_name ? v.full_name.charAt(0).toUpperCase() : "V"}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    onClick={() => nav(`/profile/${v.voyageur_id}`)}
                    className={`font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors ${compact ? "text-sm" : "text-base"}`}
                  >
                    {v.full_name || `VOY-${v.voyageur_id.substring(0, 8).toUpperCase()}`}
                  </p>
                  <UserLevelBadge userId={v.voyageur_id} variant="compact" />
                  {Number(v.total_ratings) > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-foreground">{Number(v.average_score).toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">({v.total_ratings})</span>
                    </div>
                  )}
                </div>

                {/* Trust score row */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-medium ${trust.color}`}>
                    <Award size={8} className="mr-0.5" />
                    Confiance : {trust.label}
                  </Badge>
                  {v.kyc_status === "verified" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                      <ShieldCheck size={8} className="mr-0.5" />
                      Vérifié
                    </Badge>
                  )}
                </div>

                {/* Trust badges */}
                {v.trust_badges && v.trust_badges.length > 0 && (
                  <div className="mt-1.5">
                    <TrustBadgesDisplay badges={v.trust_badges} compact />
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
        );
      })}
    </div>
  );
};

export default MatchingSuggestions;
