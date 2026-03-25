import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send as SendIcon, Search, Trash2, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { toast } from "sonner";
import { hapticLight } from "@/lib/haptics";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PullToRefresh from "@/components/PullToRefresh";
import { localizeCity } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";

interface Conversation {
  id: string;
  shipment_id: string;
  demandeur_id: string;
  voyageur_id: string;
  last_message_at: string;
  is_archived_by: string[];
  last_message?: string;
  other_name?: string;
  shipment_route?: string;
  unread_count: number;
}

const SWIPE_THRESHOLD = -80;

const SwipeableConversationItem = ({
  conversation: c,
  onOpen,
  onDelete,
  onArchive,
  isArchived,
  formatTime,
  t,
}: {
  conversation: Conversation;
  onOpen: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isArchived: boolean;
  formatTime: (d: string) => string;
  t: (k: string) => string;
}) => {
  const x = useMotionValue(0);
  // Left swipe → delete
  const deleteOpacity = useTransform(x, [-100, -40, 0], [1, 0.6, 0]);
  const deleteScale = useTransform(x, [-100, -40, 0], [1, 0.8, 0.5]);
  // Right swipe → archive
  const archiveOpacity = useTransform(x, [0, 40, 100], [0, 0.6, 1]);
  const archiveScale = useTransform(x, [0, 40, 100], [0.5, 0.8, 1]);

  const [swiped, setSwiped] = useState<"left" | "right" | false>(false);
  const [confirming, setConfirming] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      setSwiped("left");
      hapticLight();
    } else if (info.offset.x > -SWIPE_THRESHOLD) {
      setSwiped("right");
      hapticLight();
    } else {
      setSwiped(false);
    }
  };

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      hapticLight();
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    onDelete();
  };

  const handleArchive = () => {
    hapticLight();
    onArchive();
  };

  return (
    <motion.div
      variants={staggerItem}
      layout
      exit={{ opacity: 0, x: swiped === "right" ? 200 : -200, height: 0, overflow: "hidden", transition: { duration: 0.3 } }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Archive background (left side, revealed on right swipe) */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-primary rounded-xl"
        style={{ opacity: archiveOpacity, width: 90 }}
      >
        <motion.button
          style={{ scale: archiveScale }}
          onClick={handleArchive}
          className="flex flex-col items-center gap-1 text-primary-foreground"
        >
          {isArchived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
          <span className="text-[10px] font-medium">
            {isArchived ? "Restaurer" : "Archiver"}
          </span>
        </motion.button>
      </motion.div>

      {/* Delete background (right side, revealed on left swipe) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive rounded-xl"
        style={{ opacity: deleteOpacity, width: 90 }}
      >
        <motion.button
          style={{ scale: deleteScale }}
          onClick={handleDelete}
          animate={confirming ? { x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.4 } } : {}}
          className="flex flex-col items-center gap-1 text-destructive-foreground"
        >
          <motion.div
            animate={confirming ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Trash2 size={20} />
          </motion.div>
          <span className="text-[10px] font-medium">
            {confirming ? "Confirmer ?" : "Supprimer"}
          </span>
        </motion.button>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -90, right: 90 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: swiped === "left" ? -90 : swiped === "right" ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{ x }}
        onClick={() => {
          if (!swiped) onOpen();
          else setSwiped(false);
        }}
        className={`relative flex items-center gap-3 bg-card border rounded-xl px-4 py-3.5 cursor-pointer transition-colors ${confirming ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
      >
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 relative">
          <span className="text-sm font-bold text-primary">
            {c.other_name?.charAt(0)?.toUpperCase() || "?"}
          </span>
          {c.unread_count > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px]">
              {c.unread_count}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate text-foreground">{c.other_name}</p>
            <span className="text-xs text-muted-foreground shrink-0">{formatTime(c.last_message_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{c.shipment_route}</p>
          <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {c.last_message || t("conversations.noMessage")}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const deleteConversation = async (convId: string) => {
    // Delete messages first, then conversation
    await supabase.from("messages").delete().eq("conversation_id", convId);
    const { error } = await supabase.from("conversations").delete().eq("id", convId);
    if (error) {
      toast.error(t("conversations.deleteError") || "Erreur lors de la suppression");
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success(t("conversations.deleted") || "Conversation supprimée");
    }
    
  };

  const archiveConversation = async (convId: string) => {
    if (!user) return;
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const isArchived = conv.is_archived_by?.includes(user.id);
    const newArchived = isArchived
      ? conv.is_archived_by.filter((id) => id !== user.id)
      : [...(conv.is_archived_by || []), user.id];

    const { error } = await supabase
      .from("conversations")
      .update({ is_archived_by: newArchived } as any)
      .eq("id", convId);

    if (error) {
      toast.error("Erreur lors de l'archivage");
    } else {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, is_archived_by: newArchived } : c))
      );
      toast.success(isArchived ? "Conversation restaurée" : "Conversation archivée");
    }
  };

  const deleteAllArchived = async () => {
    if (!user) return;
    const archived = conversations.filter((c) => c.is_archived_by?.includes(user.id));
    if (archived.length === 0) return;

    for (const c of archived) {
      await supabase.from("messages").delete().eq("conversation_id", c.id);
      await supabase.from("conversations").delete().eq("id", c.id);
    }
    setConversations((prev) => prev.filter((c) => !c.is_archived_by?.includes(user.id)));
    setShowArchived(false);
    toast.success(`${archived.length} conversation(s) supprimée(s)`);
  };

  const load = useCallback(async () => {
    if (!user) return;
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`demandeur_id.eq.${user.id},voyageur_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos) { setLoading(false); return; }

    const enriched = await Promise.all(
      convos.map(async (c) => {
        const otherId = c.demandeur_id === user.id ? c.voyageur_id : c.demandeur_id;
        const isOtherVoyageur = c.voyageur_id === otherId;
        const otherRef = (isOtherVoyageur ? "VOY-" : "EXP-") + otherId.substring(0, 8).toUpperCase();

        const [msgRes, , shipRes] = await Promise.all([
          supabase.from("messages").select("content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1),
          Promise.resolve(),
          supabase.from("shipments").select("departure_city, arrival_city").eq("id", c.shipment_id).maybeSingle(),
        ]);

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        return {
          ...c,
          last_message: msgRes.data?.[0]?.content || "",
          other_name: otherRef,
          shipment_route: shipRes.data ? `${shipRes.data.departure_city ? localizeCity(shipRes.data.departure_city) : "—"} → ${localizeCity(shipRes.data.arrival_city)}` : "",
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();

    const channel = supabase
      .channel("conversations-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString(language === "fr" ? "fr-FR" : language, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t("conversations.yesterday");
    return d.toLocaleDateString(language === "fr" ? "fr-FR" : language, { day: "2-digit", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        <PullToRefresh onRefresh={load}>
        <div className="px-6 pt-12">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-foreground flex-1">{t("conversations.title")}</h1>
            {user && conversations.filter((c) => c.is_archived_by?.includes(user.id)).length > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                <Archive size={14} />
                <span>{conversations.filter((c) => c.is_archived_by?.includes(user.id)).length}</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-4">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Rechercher par nom ou trajet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title={t("conversations.empty")}
              description={t("conversations.emptyDesc")}
            />
          ) : (
            <>
              {/* Active conversations */}
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                {conversations
                  .filter((c) => !c.is_archived_by?.includes(user!.id))
                  .filter((c) => {
                    if (!search) return true;
                    const q = search.toLowerCase();
                    return (
                      (c.other_name || "").toLowerCase().includes(q) ||
                      (c.shipment_route || "").toLowerCase().includes(q) ||
                      (c.last_message || "").toLowerCase().includes(q)
                    );
                  })
                  .map((c) => (
                  <SwipeableConversationItem
                    key={c.id}
                    conversation={c}
                    onOpen={() => navigate(`/chat/${c.id}`)}
                    onDelete={() => deleteConversation(c.id)}
                    onArchive={() => archiveConversation(c.id)}
                    isArchived={false}
                    formatTime={formatTime}
                    t={t}
                  />
                ))}
              </motion.div>

              {/* Archived section */}
              {conversations.filter((c) => c.is_archived_by?.includes(user!.id)).length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Archive size={16} />
                      <span>
                        Archives ({conversations.filter((c) => c.is_archived_by?.includes(user!.id)).length})
                      </span>
                      <motion.div animate={{ rotate: showArchived ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} />
                      </motion.div>
                    </button>

                    {showArchived && (
                      <button
                        onClick={() => {
                          if (confirm("Supprimer toutes les conversations archivées ?")) {
                            deleteAllArchived();
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Tout supprimer</span>
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showArchived && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {conversations
                          .filter((c) => c.is_archived_by?.includes(user!.id))
                          .filter((c) => {
                            if (!search) return true;
                            const q = search.toLowerCase();
                            return (
                              (c.other_name || "").toLowerCase().includes(q) ||
                              (c.shipment_route || "").toLowerCase().includes(q)
                            );
                          })
                          .map((c) => (
                          <SwipeableConversationItem
                            key={c.id}
                            conversation={c}
                            onOpen={() => navigate(`/chat/${c.id}`)}
                            onDelete={() => deleteConversation(c.id)}
                            onArchive={() => archiveConversation(c.id)}
                            isArchived={true}
                            formatTime={formatTime}
                            t={t}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
        </PullToRefresh>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default ConversationsPage;
