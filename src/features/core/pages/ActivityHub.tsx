import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, History, Heart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

const HistoryPage = lazy(() => import("@/features/core/pages/HistoryPage"));
const FavoritesPage = lazy(() => import("@/features/core/pages/FavoritesPage"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * Hub Activité : regroupe Historique et Favoris.
 * Les anciennes routes (/history/:type, /favorites) restent fonctionnelles.
 */
const ActivityHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(() => params.get("tab") || "history");

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
            <h1 className="text-lg font-bold">{t("hub.activity.title") || "Mon activité"}</h1>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start gap-1 px-3 pb-2 bg-transparent">
              <TabsTrigger value="history" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <History size={14} /> {t("hub.activity.history") || "Historique"}
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Heart size={14} /> {t("hub.activity.favorites") || "Favoris"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="history" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <HistoryPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="favorites" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <FavoritesPage />
            </Suspense>
          </TabsContent>
        </Tabs>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default ActivityHub;
