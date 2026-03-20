import { ArrowLeft, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, IdCard, Package, ShoppingCart, Bell, Star, ShoppingBag, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import { ReactNode, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

type NotifFilter = "all" | "match" | "proof" | "status" | "reminder";

const getNotifCategory = (type: string): NotifFilter => {
  if (type.startsWith("match:")) return "match";
  if (type.startsWith("proof:")) return "proof";
  if (type.startsWith("pickup:") || type.startsWith("mission_status:") || type.startsWith("mission_cancelled:") || type.startsWith("shipment_cancelled:") || type.startsWith("accepted:") || type.startsWith("delivery:")) return "status";
  if (type.startsWith("reminder:")) return "reminder";
  return "all";
};

const filterLabels: { key: NotifFilter; label: string; icon: ReactNode }[] = [
  { key: "all", label: "Tout", icon: <Bell size={14} /> },
  { key: "match", label: "Match", icon: <Star size={14} /> },
  { key: "proof", label: "Preuve", icon: <ShoppingBag size={14} /> },
  { key: "status", label: "Statut", icon: <Package size={14} /> },
  { key: "reminder", label: "Rappel", icon: <Bell size={14} /> },
];

const typeIcon: Record<string, ReactNode> = {
  info: <Info size={18} className="text-blue-400" />,
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  error: <XCircle size={18} className="text-destructive" />,
  kyc: <IdCard size={18} className="text-purple-400" />,
  coly: <Package size={18} className="text-primary" />,
  needit: <ShoppingCart size={18} className="text-accent" />,
  pickup: <Package size={18} className="text-emerald-400" />,
  mission_status: <ShoppingBag size={18} className="text-primary" />,
};

const defaultIcon = <Bell size={18} className="text-muted-foreground" />;

const getNotifIcon = (type: string): ReactNode => {
  if (type.startsWith("proof:")) return <ShoppingBag size={18} className="text-amber-400" />;
  if (type.startsWith("match:")) return <Star size={18} className="text-amber-400" />;
  if (type.startsWith("pickup:")) return <Package size={18} className="text-emerald-400" />;
  if (type.startsWith("mission_status:") || type.startsWith("accepted:needit:")) return <ShoppingBag size={18} className="text-primary" />;
  if (type.startsWith("mission_cancelled:") || type.startsWith("shipment_cancelled:")) return <XCircle size={18} className="text-destructive" />;
  if (type.startsWith("accepted:shipment:")) return <Package size={18} className="text-primary" />;
  if (type.startsWith("delivery:")) return <CheckCircle2 size={18} className="text-emerald-400" />;
  if (type.startsWith("reminder:")) return <Bell size={18} className="text-blue-400" />;
  return typeIcon[type] || defaultIcon;
};

const getNotifLink = (type: string): string | null => {
  // proof:conversationId → chat
  if (type.startsWith("proof:")) return `/chat/${type.replace("proof:", "")}`;

  // match:shipment:id → shipment detail
  if (type.startsWith("match:shipment:")) return `/shipment/${type.replace("match:shipment:", "")}`;
  // match:needit:id → mission detail
  if (type.startsWith("match:needit:")) return `/mission/${type.replace("match:needit:", "")}`;
  // match:voyage:id → dashboard (voyageur sees matching items to accept there)
  if (type.startsWith("match:voyage:")) return "/dashboard";

  // pickup:needit:missionId → mission detail
  if (type.startsWith("pickup:needit:")) return `/mission/${type.replace("pickup:needit:", "")}`;
  // pickup:shipmentId → shipment detail
  if (type.startsWith("pickup:")) return `/shipment/${type.replace("pickup:", "")}`;

  // mission_status:missionId → mission detail
  if (type.startsWith("mission_status:")) return `/mission/${type.replace("mission_status:", "")}`;

  // mission_cancelled:missionId → mission detail
  if (type.startsWith("mission_cancelled:")) return `/mission/${type.replace("mission_cancelled:", "")}`;

  // shipment_cancelled:shipmentId → shipment detail
  if (type.startsWith("shipment_cancelled:")) return `/shipment/${type.replace("shipment_cancelled:", "")}`;

  // accepted:shipment:id → shipment detail
  if (type.startsWith("accepted:shipment:")) return `/shipment/${type.split(":")[2]}`;
  // accepted:needit:id → mission detail
  if (type.startsWith("accepted:needit:")) return `/mission/${type.split(":")[2]}`;

  // reminder:item_type:item_id
  if (type.startsWith("reminder:shipment:")) return `/shipment/${type.split(":")[2]}`;
  if (type.startsWith("reminder:needit_mission:")) return `/mission/${type.split(":")[2]}`;
  if (type.startsWith("reminder:voyage:")) return `/voyage/${type.split(":")[2]}`;

  // delivery:shipmentId → shipment detail
  if (type.startsWith("delivery:")) return `/shipment/${type.replace("delivery:", "")}`;

  // Fallback: try to extract an ID pattern for known prefixes
  return null;
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const [filter, setFilter] = useState<NotifFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => getNotifCategory(n.type) === filter);
  }, [notifications, filter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<NotifFilter, number> = { all: notifications.length, match: 0, proof: 0, status: 0, reminder: 0 };
    notifications.forEach((n) => { const cat = getNotifCategory(n.type); if (cat !== "all") counts[cat]++; });
    return counts;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold text-foreground flex-1">{t("notif.title")}</h1>
          {unreadCount > 0 && (
            <button onClick={() => markAllAsRead()} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <Check size={14} /> {t("notif.markAllRead")}
            </button>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
            {filterLabels.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {f.icon}
                {f.label}
                {categoryCounts[f.key] > 0 && (
                  <span className={`ml-0.5 text-[10px] ${filter === f.key ? "text-primary-foreground/80" : "text-muted-foreground/60"}`}>
                    {categoryCounts[f.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (<div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">Aucune pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">{t("notif.emptyDesc")}</p>

            <button
              onClick={async () => {
                if ('Notification' in window) {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    new Notification('Rappels activés', { body: 'Vous recevrez désormais des notifications push.' });
                  }
                }
              }}
              className="mt-6 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0D84FF] text-white font-bold text-sm shadow-lg shadow-[#0D84FF]/30 active:scale-[0.97] transition-transform"
            >
              <Bell size={16} /> Activer rappels push
            </button>

            <div className="mt-8 w-full max-w-sm space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">{t("notif.examples")}</p>
              {[
                { icon: <CheckCircle2 size={16} className="text-emerald-400" />, title: "Voyageur accepté !", desc: "Un voyageur a pris en charge votre colis Paris → Dakar" },
                { icon: <Package size={16} className="text-primary" />, title: "Colis en transit", desc: "Votre envoi est en route vers sa destination" },
                { icon: <ShoppingBag size={16} className="text-accent" />, title: "Mission NeedIt disponible", desc: "Une nouvelle mission correspond à votre trajet" },
                { icon: <Star size={16} className="text-amber-400" />, title: "Nouvel avis reçu", desc: "Un demandeur vous a noté 5/5 — bravo !" },
              ].map((notif, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3 bg-muted/40 border border-border/60 opacity-60">
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
            {filtered.map((n) => {
              const link = getNotifLink(n.type);
              const handleClick = () => {
                if (!n.is_read) markAsRead(n.id);
                if (link) navigate(link);
              };
              return (
                <div
                  key={n.id}
                  onClick={handleClick}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors ${link ? "cursor-pointer active:scale-[0.98]" : ""} ${!n.is_read ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}
                >
                  <span className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {!n.is_read && (
                      <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="p-1.5 rounded-lg hover:bg-muted text-primary transition-colors" title={t("notif.markRead")}><Check size={14} /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title={t("notif.delete")}><Trash2 size={14} /></button>
                    {link && <ChevronRight size={16} className="text-muted-foreground/60 ml-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
