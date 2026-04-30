import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Wallet as WalletIcon, ListOrdered, Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";
import { trackEvent } from "@/lib/analytics";
import { WalletHubSkeleton } from "@/features/core/hubs/HubSkeletons";

// Lazy-load underlying pages so each tab is fetched on demand
const SoldePage = lazy(() => import("@/features/finance/pages/SoldePage"));
const HistoryPage = lazy(() => import("@/features/core/pages/HistoryPage"));
const FacturationPage = lazy(() => import("@/features/finance/pages/FacturationPage"));

/**
 * Hub Portefeuille : regroupe Solde, Transactions et Factures.
 * Les anciennes routes (/solde, /history/:type, /facturation) restent fonctionnelles.
 */
const WalletHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(() => params.get("tab") || "balance");

  // Track hub mount once
  useEffect(() => {
    trackEvent("hub_click", "navigation", { hub: "wallet" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
    trackEvent("hub_tab_change", "navigation", { hub: "wallet", tab });
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
            <h1 className="text-lg font-bold">{t("hub.wallet.title") || "Portefeuille"}</h1>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start gap-1 px-3 pb-2 bg-transparent" aria-label={t("hub.wallet.title") || "Portefeuille"}>
              <TabsTrigger value="balance" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <WalletIcon size={14} aria-hidden="true" /> {t("hub.wallet.balance") || "Solde"}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <ListOrdered size={14} aria-hidden="true" /> {t("hub.wallet.transactions") || "Transactions"}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Receipt size={14} aria-hidden="true" /> {t("hub.wallet.invoices") || "Factures"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="balance" className="mt-0">
            <Suspense fallback={<WalletHubSkeleton />}>
              <SoldePage />
            </Suspense>
          </TabsContent>
          <TabsContent value="transactions" className="mt-0">
            <Suspense fallback={<WalletHubSkeleton />}>
              <HistoryPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="invoices" className="mt-0">
            <Suspense fallback={<WalletHubSkeleton />}>
              <FacturationPage />
            </Suspense>
          </TabsContent>
        </Tabs>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default WalletHub;
