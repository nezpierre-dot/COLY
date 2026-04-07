import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserPoints, getLevelInfo, getLevelProgress, LEVEL_STYLES } from "@/hooks/useUserPoints";
import { Trophy } from "lucide-react";

interface UserLevelBadgeProps {
  userId?: string;
  variant?: "compact" | "full" | "card";
  className?: string;
}

const LEVEL_ADVANTAGES: Record<string, string[]> = {
  green: ["Accès standard"],
  gold: ["Priorité matching", "Badge Gold visible"],
  platine: ["Priorité matching élevée", "Commission réduite -5%", "Badge Platine visible"],
  diamant: ["Priorité matching max", "Commission réduite -10%", "Visibilité accrue", "Badge Diamant visible"],
};

const UserLevelBadge = ({ userId, variant = "compact", className }: UserLevelBadgeProps) => {
  const { data: points, isLoading } = useUserPoints(userId);

  if (isLoading || !points) return null;

  const levelInfo = getLevelInfo(points.total_points);
  const progress = getLevelProgress(points.total_points);
  const style = LEVEL_STYLES[levelInfo.level] || LEVEL_STYLES.green;

  if (variant === "compact") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
        style.bg, style.border, "border", style.text,
        className
      )}>
        {style.icon} {levelInfo.label}
      </span>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
          style.bg, style.border, "border", style.text
        )}>
          {style.icon} {levelInfo.label}
        </span>
        <span className="text-xs text-muted-foreground">{points.total_points} pts</span>
      </div>
    );
  }

  // Card variant - detailed view
  const advantages = LEVEL_ADVANTAGES[levelInfo.level] || [];

  return (
    <div className={cn(
      "rounded-2xl border p-4 space-y-3",
      style.bg, style.border,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
            `bg-gradient-to-br ${style.gradient}`,
            "text-white shadow-md"
          )}>
            {style.icon}
          </div>
          <div>
            <p className={cn("text-sm font-bold", style.text)}>{levelInfo.label}</p>
            <p className="text-xs text-muted-foreground">{points.total_points} points</p>
          </div>
        </div>
        <Trophy size={18} className={style.text} />
      </div>

      {/* Progress to next level */}
      {levelInfo.next && levelInfo.nextMin && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{levelInfo.label}</span>
            <span>{levelInfo.next} ({levelInfo.nextMin} pts)</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", style.gradient)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {levelInfo.nextMin - points.total_points} pts restants
          </p>
        </div>
      )}

      {/* Advantages */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avantages</p>
        {advantages.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="text-[8px]">✦</span>
            {a}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserLevelBadge;
