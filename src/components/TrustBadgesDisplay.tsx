import { ShieldCheck, Star, Award, Crown } from "lucide-react";

export interface TrustBadge {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const TRUST_BADGES: Record<string, TrustBadge> = {
  verified: {
    key: "verified",
    label: "Vérifié",
    icon: <ShieldCheck size={12} />,
    color: "bg-success/10 text-success border-success/20",
  },
  top_rated: {
    key: "top_rated",
    label: "Top Noté",
    icon: <Star size={12} />,
    color: "bg-warning/10 text-warning border-warning/20",
  },
  super_host: {
    key: "super_host",
    label: "Super Host",
    icon: <Award size={12} />,
    color: "bg-primary/10 text-primary border-primary/20",
  },
  top_100: {
    key: "top_100",
    label: "Top 100",
    icon: <Crown size={12} />,
    color: "bg-accent/10 text-accent border-accent/20",
  },
};

interface TrustBadgesDisplayProps {
  badges: string[];
  compact?: boolean;
}

const TrustBadgesDisplay = ({ badges, compact = false }: TrustBadgesDisplayProps) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className={`flex ${compact ? "gap-1" : "gap-1.5"} flex-wrap`}>
      {badges.map((key) => {
        const badge = TRUST_BADGES[key];
        if (!badge) return null;
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 border rounded-full font-semibold ${badge.color} ${
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
            }`}
          >
            {badge.icon}
            {!compact && badge.label}
          </span>
        );
      })}
    </div>
  );
};

export default TrustBadgesDisplay;
