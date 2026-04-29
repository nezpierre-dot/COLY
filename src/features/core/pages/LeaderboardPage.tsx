import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Trophy, Star, Package, Crown, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { useTranslation } from "@/hooks/useTranslation";

const PODIUM_STYLES = [
  { bg: "bg-amber-400/10", border: "border-amber-400/30", text: "text-amber-500", icon: Crown, rank: "🥇" },
  { bg: "bg-slate-300/10", border: "border-slate-300/30", text: "text-slate-400", icon: Medal, rank: "🥈" },
  { bg: "bg-amber-700/10", border: "border-amber-700/30", text: "text-amber-700", icon: Medal, rank: "🥉" },
];

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["weekly-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard", { _limit: 10 });
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => {
    try { return d.toLocaleDateString(localeTag, { day: "numeric", month: "short" }); }
    catch { return d.toLocaleDateString("en-US", { day: "numeric", month: "short" }); }
  };
  const weekLabel = `${fmt(monday)} — ${fmt(sunday)}`;

  return (
    <PageTransition>
      <div
        className="min-h-screen bg-gradient-soft"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="relative overflow-hidden px-6 pt-12 pb-8 bg-gradient-to-b from-amber-500/20 to-background">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-xl bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>

          <div className="text-center mt-2">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-3"
            >
              <Trophy size={28} className="text-amber-500" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">{t("leaderboard.title")}</h1>
            <p className="text-xs text-muted-foreground mt-1">{weekLabel}</p>
          </div>
        </div>

        <div className="px-4 -mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : leaderboard.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Trophy size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">{t("leaderboard.empty.title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("leaderboard.empty.subtitle")}</p>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((entry: any, i: number) => {
                const isPodium = i < 3;
                const podium = isPodium ? PODIUM_STYLES[i] : null;
                const isCurrentUser = entry.voyageur_id === user?.id;

                return (
                  <motion.div
                    key={entry.voyageur_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => navigate(`/profile/${entry.voyageur_id}`)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors active:scale-[0.98] ${
                      isCurrentUser
                        ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                        : isPodium
                          ? `${podium!.bg} ${podium!.border}`
                          : "bg-card border-border"
                    }`}
                  >
                    <div className="w-8 text-center shrink-0">
                      {isPodium ? (
                        <span className="text-xl">{podium!.rank}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                      )}
                    </div>

                    <Avatar className="h-10 w-10 rounded-xl shrink-0">
                      <AvatarImage src={entry.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-muted text-foreground font-bold rounded-xl text-sm">
                        {entry.full_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {entry.full_name || t("leaderboard.defaultTraveler")}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {t("leaderboard.you")}
                          </span>
                        )}
                      </div>
                      {entry.total_ratings > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={11} className="text-amber-400" fill="currentColor" />
                          <span className="text-xs text-muted-foreground">
                            {entry.average_score} ({entry.total_ratings})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Package size={14} className={isPodium ? podium!.text : "text-primary"} />
                      <span className={`text-lg font-bold ${isPodium ? podium!.text : "text-foreground"}`}>
                        {entry.weekly_deliveries}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-muted/30 border border-border rounded-2xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">{t("leaderboard.info")}</p>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default LeaderboardPage;
