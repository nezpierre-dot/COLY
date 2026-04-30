import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Trophy, Award } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

const StatisticsTab = lazy(() => import("@/features/profile/StatisticsTab"));
const LeaderboardPage = lazy(() => import("@/features/core/pages/LeaderboardPage"));
// Badges section reuses GamifiedBadges via a dedicated wrapper
const BadgesSection = lazy(() => import("@/features/core/pages/BadgesSection"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * Hub Progression : regroupe Statistiques, Classement et Badges.
 * Les anciennes routes (/leaderboard) restent fonctionnelles.
 */
const ProgressionHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(() => params.get("tab") || "stats");

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <PageTransition>
      <div
        className="min-h-screen bg-background"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center"
              aria-label={t("common.back") || "Retour"}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold">{t("hub.progression.title") || "Progression"}</h1>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start gap-1 px-3 pb-2 bg-transparent">
              <TabsTrigger value="stats" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <BarChart3 size={14} /> {t("hub.progression.stats") || "Mes stats"}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Trophy size={14} /> {t("hub.progression.leaderboard") || "Classement"}
              </TabsTrigger>
              <TabsTrigger value="badges" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Award size={14} /> {t("hub.progression.badges") || "Badges"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="stats" className="mt-0 px-4 pt-4">
            <Suspense fallback={<TabFallback />}>
              <StatisticsTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <LeaderboardPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="badges" className="mt-0 px-4 pt-4">
            <Suspense fallback={<TabFallback />}>
              <BadgesSection />
            </Suspense>
          </TabsContent>
        </Tabs>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default ProgressionHub;
