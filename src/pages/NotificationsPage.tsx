import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";

const typeIcon: Record<string, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
  kyc: "🪪",
  coly: "📦",
  needit: "🛒",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Check size={14} /> Tout marquer lu
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🔔</span>
            <p className="text-lg font-semibold text-foreground">Aucune notification</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
              Vous recevrez ici les mises à jour de votre compte
            </p>

            {/* Smart notification examples */}
            <div className="mt-8 w-full max-w-sm space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                Exemples de notifications à venir
              </p>
              {[
                { emoji: "✅", title: "Voyageur accepté !", desc: "Un voyageur a pris en charge votre colis Paris → Dakar", type: "success" },
                { emoji: "📦", title: "Colis en transit", desc: "Votre envoi est en route vers sa destination", type: "coly" },
                { emoji: "🛍️", title: "Mission NeedIt disponible", desc: "Une nouvelle mission correspond à votre trajet", type: "needit" },
                { emoji: "⭐", title: "Nouvel avis reçu", desc: "Un demandeur vous a noté 5/5 — bravo !", type: "info" },
              ].map((notif, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 bg-muted/40 border border-border/60 opacity-60"
                >
                  <span className="text-lg mt-0.5">{notif.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors ${
                  !n.is_read
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border"
                }`}
              >
                <span className="text-xl mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-primary transition-colors"
                      title="Marquer comme lu"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
