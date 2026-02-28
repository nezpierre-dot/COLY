import { ArrowLeft, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, IdCard, Package, ShoppingCart, Bell, Star, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import { ReactNode } from "react";

const typeIcon: Record<string, ReactNode> = {
  info: <Info size={18} className="text-blue-400" />,
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  error: <XCircle size={18} className="text-destructive" />,
  kyc: <IdCard size={18} className="text-purple-400" />,
  coly: <Package size={18} className="text-primary" />,
  needit: <ShoppingCart size={18} className="text-accent" />,
};

const defaultIcon = <Bell size={18} className="text-muted-foreground" />;

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
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bell size={28} className="text-muted-foreground" />
            </div>
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
                { icon: <CheckCircle2 size={16} className="text-emerald-400" />, title: "Voyageur accepté !", desc: "Un voyageur a pris en charge votre colis Paris → Dakar" },
                { icon: <Package size={16} className="text-primary" />, title: "Colis en transit", desc: "Votre envoi est en route vers sa destination" },
                { icon: <ShoppingBag size={16} className="text-accent" />, title: "Mission NeedIt disponible", desc: "Une nouvelle mission correspond à votre trajet" },
                { icon: <Star size={16} className="text-amber-400" />, title: "Nouvel avis reçu", desc: "Un demandeur vous a noté 5/5 — bravo !" },
              ].map((notif, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 bg-muted/40 border border-border/60 opacity-60"
                >
                  <span className="mt-0.5 shrink-0">{notif.icon}</span>
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
                <span className="mt-0.5 shrink-0">{typeIcon[n.type] || defaultIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
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