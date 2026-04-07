import { usePointsHistory } from "@/hooks/useUserPoints";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, { label: string; emoji: string }> = {
  shipment_delivered: { label: "Colis livré", emoji: "📦" },
  needit_completed: { label: "Mission NeedIt", emoji: "🛒" },
  good_rating: { label: "Bonne note reçue", emoji: "⭐" },
  referral_validated: { label: "Parrainage validé", emoji: "🤝" },
};

const PointsHistoryCard = () => {
  const { data: history = [], isLoading } = usePointsHistory();

  if (isLoading) return null;
  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        Aucun point gagné pour le moment. Complétez des missions pour gagner des points !
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, 20).map((h: any) => {
        const info = REASON_LABELS[h.reason] || { label: h.reason, emoji: "🎯" };
        return (
          <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm">{info.emoji}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{info.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <span className={cn(
              "text-xs font-bold",
              h.points > 0 ? "text-emerald-600" : "text-destructive"
            )}>
              +{h.points} pts
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PointsHistoryCard;
