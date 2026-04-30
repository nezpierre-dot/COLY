import { ArrowLeft, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, IdCard, Package, ShoppingCart, Bell, Star, ShoppingBag, ChevronRight, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, pt, it, arSA } from "date-fns/locale";

const dateLocaleMap: Record<string, typeof fr> = {
  fr, en: enUS as typeof fr, es: es as typeof fr, de: de as typeof fr,
  pt: pt as typeof fr, it: it as typeof fr, ar: arSA as typeof fr,
};
import BottomNav from "@/components/BottomNav";
import SwipeToDelete from "@/components/SwipeToDelete";
import PullToRefresh from "@/components/PullToRefresh";
import { NotificationSkeleton } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import { ReactNode, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticMedium } from "@/lib/haptics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NotifFilter = "all" | "match" | "proof" | "status" | "reminder";
type ReadFilter = "all" | "unread" | "latest";

const getNotifCategory = (type: string): NotifFilter => {
  if (type.startsWith("match:")) return "match";
  if (type.startsWith("proof:")) return "proof";
  if (type.startsWith("pickup:") || type.startsWith("mission_status:") || type.startsWith("mission_cancelled:") || type.startsWith("shipment_cancelled:") || type.startsWith("accepted:") || type.startsWith("delivery:")) return "status";
  if (type.startsWith("reminder:")) return "reminder";
  return "all";
};

const filterLabels: { key: NotifFilter; label: string; icon: ReactNode }[] = [
  { key: "all", label: "Tout", icon: <Bell size={14} /> },
  { key: "match", label: "Mises en relation", icon: <Star size={14} /> },
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
  const { t, language } = useTranslation();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();

  const [filter, setFilter] = useState<NotifFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "single" | "bulk"; id?: string } | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = filter === "all" ? notifications : notifications.filter((n) => getNotifCategory(n.type) === filter);
    if (readFilter === "unread") list = list.filter((n) => !n.is_read);
    if (readFilter === "latest") {
      list = [...list]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    }
    return list;
  }, [notifications, filter, readFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<NotifFilter, number> = { all: notifications.length, match: 0, proof: 0, status: 0, reminder: 0 };
    notifications.forEach((n) => { const cat = getNotifCategory(n.type); if (cat !== "all") counts[cat]++; });
    return counts;
  }, [notifications]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  };

  const deleteSelected = async () => {
    for (const id of selected) {
      await deleteNotification(id);
    }
    setSelected(new Set());
    setSelectMode(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    hapticMedium();
    if (deleteConfirm.type === "single" && deleteConfirm.id) {
      const id = deleteConfirm.id;
      setDeleteConfirm(null);
      setExitingIds((prev) => new Set(prev).add(id));
      // Wait for exit animation then actually delete
      setTimeout(async () => {
        await deleteNotification(id);
        setExitingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }, 300);
    } else if (deleteConfirm.type === "bulk") {
      const ids = new Set(selected);
      setDeleteConfirm(null);
      setExitingIds(ids);
      setTimeout(async () => {
        for (const id of ids) await deleteNotification(id);
        setExitingIds(new Set());
        setSelected(new Set());
        setSelectMode(false);
      }, 300);
    } else {
      setDeleteConfirm(null);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="page-shell">
      <PullToRefresh onRefresh={async () => { await refresh(); }}>
      <header className="page-header-soft">
        <div className="page-content">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => selectMode ? exitSelectMode() : navigate(-1)}
              className="icon-btn-soft"
              aria-label="Retour"
            >
              <ArrowLeft size={18} className="text-foreground" />
            </button>
            {selectMode ? (
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="text-xs text-primary font-semibold hover:underline">
                  {selected.size === filtered.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
                <button
                  onClick={() => setDeleteConfirm({ type: "bulk" })}
                  disabled={selected.size === 0}
                  className="flex items-center gap-1 text-xs text-destructive font-semibold hover:underline disabled:opacity-40"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={() => setSelectMode(true)} className="text-xs text-foreground/70 font-semibold hover:text-foreground transition-colors">
                    Sélectionner
                  </button>
                )}
                {unreadCount > 0 && (
                  <button onClick={() => markAllAsRead()} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    <Check size={14} /> {t("notif.markAllRead")}
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="greeting-bubble-xl mb-3">
            <Bell size={18} className="text-primary" />
            {selectMode ? `${selected.size} sélectionnée${selected.size > 1 ? "s" : ""}` : t("notif.title")}
          </span>
          <h1 className="text-[clamp(1.85rem,5.5vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Restez informé<br />
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">à chaque instant.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground font-medium max-w-[280px]">
            Toutes vos alertes, matchs et mises à jour réunies ✨
          </p>
        </div>
      </header>

      <main className="page-content pt-6">

        {notifications.length > 0 && !selectMode && (
          <>
            {/* Segmented sort/read filter */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 inline-flex bg-muted rounded-2xl p-1">
                {([
                  { key: "unread" as ReadFilter, label: `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
                  { key: "all" as ReadFilter, label: "Toutes" },
                  { key: "latest" as ReadFilter, label: "Dernières" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setReadFilter(opt.key)}
                    className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      readFilter === opt.key
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline whitespace-nowrap"
                  aria-label="Marquer tout comme lu"
                >
                  <Check size={12} /> Tout lire
                </button>
              )}
            </div>

            {/* Category filter chips */}
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
          </>
        )}

        {loading ? (
          <NotificationSkeleton count={5} />
        ) : filtered.length === 0 && notifications.length > 0 ? (
          <EmptyState
            icon={Bell}
            nido="search"
            title="Rien à afficher dans ce filtre"
            description="Aucune notification ne correspond aux filtres sélectionnés. Réinitialisez pour voir tout."
            action={
              <button
                onClick={() => { setFilter("all"); setReadFilter("all"); }}
                className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                Réinitialiser les filtres
              </button>
            }
          />
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
                { icon: <CheckCircle2 size={16} className="text-emerald-400" />, title: "Transporteur accepté !", desc: "Un transporteur a pris en charge votre colis Paris → Dakar" },
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
          <AnimatePresence initial={false}>
            {filtered.map((n) => {
              const link = getNotifLink(n.type);
              const isSelected = selected.has(n.id);
              const isExiting = exitingIds.has(n.id);
              const handleClick = () => {
                if (selectMode) {
                  toggleSelect(n.id);
                  return;
                }
                if (!n.is_read) markAsRead(n.id);
                if (link) navigate(link);
              };
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 1, height: "auto", x: 0 }}
                  animate={isExiting
                    ? { opacity: 0, height: 0, x: -60, marginBottom: 0 }
                    : { opacity: 1, height: "auto", x: 0 }
                  }
                  exit={{ opacity: 0, height: 0, x: -60, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden mb-2"
                >
                  <SwipeToDelete
                    onDelete={() => setDeleteConfirm({ type: "single", id: n.id })}
                    disabled={selectMode}
                  >
                    <div
                      onClick={handleClick}
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors cursor-pointer active:scale-[0.98] ${
                        selectMode && isSelected
                          ? "bg-primary/10 border-primary/40"
                          : !n.is_read
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card border-border"
                      }`}
                    >
                      {selectMode ? (
                        <div className={`mt-1 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {isSelected && <Check size={12} className="text-primary-foreground" />}
                        </div>
                      ) : (
                        <span className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocaleMap[language] ?? fr })}</p>
                      </div>
                      {!selectMode && (
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          {!n.is_read && (
                            <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="p-1.5 rounded-lg hover:bg-muted text-primary transition-colors" title={t("notif.markRead")}><Check size={14} /></button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "single", id: n.id }); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title={t("notif.delete")}><Trash2 size={14} /></button>
                          {link && <ChevronRight size={16} className="text-muted-foreground/60 ml-0.5" />}
                        </div>
                      )}
                    </div>
                  </SwipeToDelete>
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        )}
      </main>
      </PullToRefresh>
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "bulk"
                ? `Supprimer ${selected.size} notification${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""} ? Cette action est irréversible.`
                : "Supprimer cette notification ? Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}