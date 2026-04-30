import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, Package, ShieldCheck, Star, Users, Zap, Trophy, Crown, Heart, Globe,
} from "lucide-react";
import { hapticSuccess } from "@/lib/haptics";

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  tier: "bronze" | "silver" | "gold";
  check: (s: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalVoyages: number;
  deliveredCount: number;
  totalRatings: number;
  averageScore: number;
  kycVerified: boolean;
  totalDistance: number;
  totalMissions: number;
  referrals: number;
}

const TIER_STYLES = {
  bronze: {
    bg: "bg-amber-700/10",
    border: "border-amber-700/30",
    text: "text-amber-700",
    glow: "shadow-[0_0_16px_rgba(180,83,9,0.25)]",
    ring: "ring-amber-600/40",
  },
  silver: {
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    text: "text-slate-500",
    glow: "shadow-[0_0_16px_rgba(148,163,184,0.3)]",
    ring: "ring-slate-400/40",
  },
  gold: {
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    text: "text-amber-500",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]",
    ring: "ring-amber-400/50",
  },
};

export const GAMIFIED_BADGES: BadgeDef[] = [
  {
    id: "first_voyage",
    label: "Premier Voyage",
    description: "Publier son premier voyage",
    icon: Plane,
    tier: "bronze",
    check: (s) => s.totalVoyages >= 1,
  },
  {
    id: "5_voyages",
    label: "Globe-Trotter",
    description: "Publier 5 voyages",
    icon: Globe,
    tier: "silver",
    check: (s) => s.totalVoyages >= 5,
  },
  {
    id: "first_delivery",
    label: "Première Livraison",
    description: "Livrer son premier colis",
    icon: Package,
    tier: "bronze",
    check: (s) => s.deliveredCount >= 1,
  },
  {
    id: "10_deliveries",
    label: "Transporteur Pro",
    description: "Réaliser 10 livraisons",
    icon: Zap,
    tier: "silver",
    check: (s) => s.deliveredCount >= 10,
  },
  {
    id: "50_deliveries",
    label: "Légende",
    description: "Réaliser 50 livraisons",
    icon: Crown,
    tier: "gold",
    check: (s) => s.deliveredCount >= 50,
  },
  {
    id: "kyc_verified",
    label: "Transporteur Vérifié",
    description: "Vérifier son identité (KYC)",
    icon: ShieldCheck,
    tier: "bronze",
    check: (s) => s.kycVerified,
  },
  {
    id: "top_rated",
    label: "Étoile Montante",
    description: "Obtenir une note moyenne ≥ 4.5",
    icon: Star,
    tier: "gold",
    check: (s) => s.totalRatings >= 3 && s.averageScore >= 4.5,
  },
  {
    id: "community",
    label: "Ambassadeur",
    description: "Parrainer au moins 3 utilisateurs",
    icon: Users,
    tier: "silver",
    check: (s) => s.referrals >= 3,
  },
  {
    id: "10k_km",
    label: "10 000 km",
    description: "Cumuler 10 000 km de distance",
    icon: Trophy,
    tier: "gold",
    check: (s) => s.totalDistance >= 10000,
  },
  {
    id: "generous",
    label: "Cœur Généreux",
    description: "Accepter 20 missions au total",
    icon: Heart,
    tier: "silver",
    check: (s) => s.totalMissions >= 20,
  },
];

interface GamifiedBadgesProps {
  stats: BadgeStats;
}

const STORAGE_KEY = "gamified_badges_seen";

const GamifiedBadges = ({ stats }: GamifiedBadgesProps) => {
  const [seenBadges, setSeenBadges] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [celebratingBadge, setCelebratingBadge] = useState<string | null>(null);

  const { unlocked, locked } = useMemo(() => {
    const u: BadgeDef[] = [];
    const l: BadgeDef[] = [];
    for (const b of GAMIFIED_BADGES) {
      if (b.check(stats)) u.push(b);
      else l.push(b);
    }
    return { unlocked: u, locked: l };
  }, [stats]);

  // Detect newly unlocked badges
  useEffect(() => {
    const newlyUnlocked = unlocked.find((b) => !seenBadges.has(b.id));
    if (newlyUnlocked) {
      setCelebratingBadge(newlyUnlocked.id);
      hapticSuccess();
      const timer = setTimeout(() => {
        setCelebratingBadge(null);
        setSeenBadges((prev) => {
          const next = new Set(prev);
          next.add(newlyUnlocked.id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
          return next;
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [unlocked, seenBadges]);

  const progress = GAMIFIED_BADGES.length > 0
    ? Math.round((unlocked.length / GAMIFIED_BADGES.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Badges</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {unlocked.length}/{GAMIFIED_BADGES.length} débloqués
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebratingBadge && (() => {
          const b = GAMIFIED_BADGES.find((x) => x.id === celebratingBadge);
          if (!b) return null;
          const tier = TIER_STYLES[b.tier];
          return (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`relative flex flex-col items-center gap-2 py-6 rounded-2xl border ${tier.bg} ${tier.border} ${tier.glow}`}
            >
              {/* Sparkle particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-amber-400"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: Math.cos((i * 60 * Math.PI) / 180) * 50,
                    y: Math.sin((i * 60 * Math.PI) / 180) * 50,
                    scale: [0, 1.5, 0],
                  }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.08 }}
                  style={{ top: "50%", left: "50%" }}
                />
              ))}

              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.15 }}
                className={`w-14 h-14 rounded-2xl ${tier.bg} border ${tier.border} flex items-center justify-center ring-2 ${tier.ring}`}
              >
                <b.icon size={28} className={tier.text} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-xs font-bold uppercase tracking-wider text-foreground"
              >
                🎉 Badge débloqué !
              </motion.p>
              <p className="text-sm font-bold text-foreground">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Unlocked badges grid */}
      {unlocked.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {unlocked.map((b, i) => {
            const tier = TIER_STYLES[b.tier];
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border ${tier.bg} ${tier.border}`}
              >
                <div className={`w-10 h-10 rounded-xl ${tier.bg} border ${tier.border} flex items-center justify-center`}>
                  <b.icon size={20} className={tier.text} />
                </div>
                <p className="text-[10px] font-bold text-foreground text-center leading-tight">{b.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {locked.map((b) => (
            <div
              key={b.id}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-border bg-muted/30 opacity-40"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                <b.icon size={20} className="text-muted-foreground" />
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{b.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GamifiedBadges;
