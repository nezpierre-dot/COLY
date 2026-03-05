import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send as SendIcon } from "lucide-react";
import { motion } from "framer-motion";
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
  last_message?: string;
  other_name?: string;
  shipment_route?: string;
  unread_count: number;
}

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {conversations.map((c) => (
                <motion.button
                  key={c.id}
                  variants={staggerItem}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 hover:shadow-sm transition-shadow text-left"
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
                      <p className="text-sm font-semibold truncate text-foreground">
                        {c.other_name}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatTime(c.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.shipment_route}</p>
                    <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {c.last_message || t("conversations.noMessage")}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
        </PullToRefresh>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default ConversationsPage;
