import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Truck, ArrowUpCircle, ShoppingBag, TrendingUp, Sparkles, Package, Image } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import PullToRefresh from "@/components/PullToRefresh";
import { useTranslation } from "@/hooks/useTranslation";
import StatisticsTab from "@/features/profile/StatisticsTab";

type HistoryType = "voyageur" | "coly" | "needit";
type AIFilter = "all" | "best" | "losses";
type ViewTab = "historique" | "stats";

interface HistoryItem {
  id: string;
  type: string;
  ref: string;
  amount: number;
  date: string;
  rawDate: Date;
  category: HistoryType;
  icon: string;
  status: string;
  photoUrl: string | null;
  detailPath: string;
}

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const PIE_COLORS = [
  "hsl(214, 80%, 52%)",
  "hsl(252, 40%, 75%)",
  "hsl(33, 90%, 62%)",
];

const iconMap: Record<string, React.ReactNode> = {
  transport: <Truck size={18} className="text-primary" />,
  envoi: <ArrowUpCircle size={18} className="text-secondary" />,
  needit: <ShoppingBag size={18} className="text-accent" />,
};

const iconBgMap: Record<string, string> = {
  transport: "bg-primary/10",
  envoi: "bg-secondary/10",
  needit: "bg-accent/10",
};

const statusConfig: Record<string, { label: string; bg: string }> = {
  pending: { label: "En attente", bg: "bg-amber-500/15 text-amber-600" },
  accepted: { label: "Accepté", bg: "bg-primary/15 text-primary" },
  picked_up: { label: "Récupéré", bg: "bg-secondary/15 text-secondary" },
  in_transit: { label: "En transit", bg: "bg-accent/15 text-accent" },
  delivered: { label: "Livré", bg: "bg-emerald-500/15 text-emerald-600" },
  completed: { label: "Terminé", bg: "bg-emerald-500/15 text-emerald-600" },
  cancelled: { label: "Annulé", bg: "bg-destructive/15 text-destructive" },
};

const PLATFORM_RATE = 0.18;
const CLASSIC_RATE_PER_UNIT = 35;

const HistoryPage = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { user, roles } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");
  const initialTab = (type as HistoryType) || (isVoyageur ? "voyageur" : "coly");

  const [activeTab, setActiveTab] = useState<HistoryType | "all">(
    ["voyageur", "coly", "needit"].includes(initialTab) ? initialTab : "all"
  );
  const [search, setSearch] = useState("");
  const [aiFilter, setAiFilter] = useState<AIFilter>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("historique");

  // TanStack Query for shipments
  const { data: shipData = [], isLoading: loadingShip, refetch: refetchShip } = useQuery({
    queryKey: ["history-shipments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // TanStack Query for missions
  const { data: missData = [], isLoading: loadingMiss, refetch: refetchMiss } = useQuery({
    queryKey: ["history-missions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("needit_missions")
        .select("*")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const loading = loadingShip || loadingMiss;

  // Transform to HistoryItems
  const allData = useMemo(() => {
    if (!user) return [];
    const items: HistoryItem[] = [];

    // Shipments as demandeur (expenses)
    shipData.filter(s => s.user_id === user.id).forEach((s) => {
      const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      items.push({
        id: `s-dem-${s.id}`,
        type: "Envoi Coly",
        ref: `COLY-${s.id.slice(0, 8).toUpperCase()}`,
        amount: -raw,
        date: new Date(s.created_at).toLocaleDateString("fr-FR"),
        rawDate: new Date(s.created_at),
        category: "coly",
        icon: "envoi",
        status: s.status,
        photoUrl: s.photo_url,
        detailPath: `/shipment/${s.id}`,
      });
    });

    // Shipments as voyageur (gains)
    shipData.filter(s => s.voyageur_id === user.id).forEach((s) => {
      const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      const gain = raw * (1 - PLATFORM_RATE);
      if (gain > 0) {
        items.push({
          id: `s-voy-${s.id}`,
          type: "Transport Coly",
          ref: `COLY-${s.id.slice(0, 8).toUpperCase()}`,
          amount: gain,
          date: new Date(s.created_at).toLocaleDateString("fr-FR"),
          rawDate: new Date(s.created_at),
          category: "voyageur",
          icon: "transport",
          status: s.status,
          photoUrl: s.photo_url,
          detailPath: `/shipment/${s.id}`,
        });
      }
    });

    // NeedIt as demandeur
    missData.filter(m => m.user_id === user.id).forEach((m) => {
      const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      if (raw > 0) {
        items.push({
          id: `n-dem-${m.id}`,
          type: "Mission NeedIt",
          ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`,
          amount: -raw,
          date: new Date(m.created_at).toLocaleDateString("fr-FR"),
          rawDate: new Date(m.created_at),
          category: "needit",
          icon: "needit",
          status: m.status,
          photoUrl: m.photo_url,
          detailPath: `/needit-detail/${m.id}`,
        });
      }
    });

    // NeedIt as voyageur
    missData.filter(m => m.voyageur_id === user.id).forEach((m) => {
      const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      const gain = raw * (1 - PLATFORM_RATE);
      if (gain > 0) {
        items.push({
          id: `n-voy-${m.id}`,
          type: "Mission NeedIt (gain)",
          ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`,
          amount: gain,
          date: new Date(m.created_at).toLocaleDateString("fr-FR"),
          rawDate: new Date(m.created_at),
          category: "voyageur",
          icon: "transport",
          status: m.status,
          photoUrl: m.photo_url,
          detailPath: `/needit-detail/${m.id}`,
        });
      }
    });

    items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return items;
  }, [shipData, missData, user]);

  // Filtered data
  const filtered = useMemo(() => {
    let items = activeTab === "all" ? allData : allData.filter((i) => i.category === activeTab);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.ref.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)
      );
    }
    if (aiFilter === "best") {
      items = [...items].sort((a, b) => b.amount - a.amount).filter((i) => i.amount > 0);
    } else if (aiFilter === "losses") {
      items = [...items].sort((a, b) => a.amount - b.amount).filter((i) => i.amount < 0);
    }
    return items;
  }, [activeTab, search, aiFilter, allData]);

  // Stats
  const totalGains = useMemo(() => allData.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0), [allData]);
  const totalExpenses = useMemo(() => allData.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0), [allData]);
  const netBalance = totalGains - totalExpenses;

  const shipmentCount = allData.filter(i => i.category === "coly" && i.amount < 0).length;
  const estimatedClassic = shipmentCount * CLASSIC_RATE_PER_UNIT;
  const savings = estimatedClassic - totalExpenses;

  // Pie data
  const pieData = useMemo(() => {
    const voyTotal = allData.filter((i) => i.category === "voyageur").reduce((s, i) => s + Math.abs(i.amount), 0);
    const colyTotal = allData.filter((i) => i.category === "coly").reduce((s, i) => s + Math.abs(i.amount), 0);
    const needitTotal = allData.filter((i) => i.category === "needit").reduce((s, i) => s + Math.abs(i.amount), 0);
    return [
      { name: "Voyageur", value: voyTotal },
      { name: "Coly", value: colyTotal },
      { name: "NeedIt", value: needitTotal },
    ].filter(d => d.value > 0);
  }, [allData]);

  // Monthly bar chart
  const barData = useMemo(() => {
    const months: Record<string, { gains: number; expenses: number }> = {};
    allData.forEach((item) => {
      const monthIdx = item.rawDate.getMonth();
      const key = MONTHS[monthIdx];
      if (!months[key]) months[key] = { gains: 0, expenses: 0 };
      if (item.amount > 0) months[key].gains += item.amount;
      else months[key].expenses += Math.abs(item.amount);
    });
    return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
  }, [allData]);

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  const handleRefresh = async () => {
    await Promise.all([refetchShip(), refetchMiss()]);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
      <PageTransition>
        <main className="px-6 pt-12" id="main-content" role="main">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-[26px] font-bold text-foreground leading-tight">{t("history.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("history.subtitle")}</p>
          </div>
        </div>

        {/* View toggle: Historique / Stats */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setViewTab("historique")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              viewTab === "historique"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            📋 Historique
          </button>
          <button
            onClick={() => setViewTab("stats")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              viewTab === "stats"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            📊 Statistiques
          </button>
        </div>

        {viewTab === "stats" ? (
          <StatisticsTab />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-primary/10 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">{t("history.gains")}</p>
                <p className="text-xl font-black text-primary mt-1">+{totalGains.toFixed(0)}{getCurrencySymbol()}</p>
              </div>
              <div className="bg-destructive/10 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">{t("history.expenses")}</p>
                <p className="text-xl font-black text-destructive mt-1">-{totalExpenses.toFixed(0)}{getCurrencySymbol()}</p>
              </div>
              <div className={`rounded-2xl p-4 text-center ${netBalance >= 0 ? "bg-primary/5" : "bg-destructive/10"}`}>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">{t("history.net")}</p>
                <p className={`text-xl font-black mt-1 ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                  {netBalance >= 0 ? "+" : ""}{netBalance.toFixed(0)}{getCurrencySymbol()}
                </p>
              </div>
            </div>

            {/* Savings card */}
            {savings > 0 && (
              <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wide">{t("history.savings")}</p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {t("history.youSaved")} <span className="text-accent">+{savings.toFixed(0)}{getCurrencySymbol()}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Category tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setAiFilter("all"); }}>
              <TabsList className="w-full bg-muted rounded-2xl p-1 h-auto mb-4">
                <TabsTrigger value="all" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background">
                  Tout
                </TabsTrigger>
                <TabsTrigger value="voyageur" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Voyageur
                </TabsTrigger>
                <TabsTrigger value="coly" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Coly
                </TabsTrigger>
                <TabsTrigger value="needit" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                  NeedIt
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Charts */}
            {!loading && allData.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-card rounded-2xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-2">{t("history.distribution")}</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(1)}${getCurrencySymbol()}`}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-2">{t("history.timeline")}</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={barData} barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(1)}${getCurrencySymbol()}`}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      />
                      <Bar dataKey="gains" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">{t("history.gains")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="text-xs text-muted-foreground">{t("history.expenses")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search + AI filters */}
            <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-3">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder={t("history.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {([
                { key: "all" as AIFilter, label: t("common.all"), icon: null },
                { key: "best" as AIFilter, label: t("history.aiBest"), icon: <TrendingUp size={12} /> },
                { key: "losses" as AIFilter, label: t("history.aiLosses"), icon: <Sparkles size={12} /> },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setAiFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    aiFilter === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Total for current filter */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {loading ? t("common.loading") : `${filtered.length} transaction${filtered.length > 1 ? "s" : ""}`}
              </p>
              <p className={`text-lg font-bold ${total >= 0 ? "text-primary" : "text-destructive"}`}>
                {total >= 0 ? "+" : ""}{total.toFixed(2)}{getCurrencySymbol()}
              </p>
            </div>

            {/* Transaction list */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-3.5 animate-pulse flex gap-3">
                    <div className="w-12 h-12 bg-muted rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.ul
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2"
                role="list"
              >
                {filtered.length === 0 ? (
                  <li className="text-center py-12">
                    <p className="text-muted-foreground text-sm">{t("history.noResultFilter")}</p>
                  </li>
                ) : (
                  filtered.map((item) => (
                    <motion.li
                      key={item.id}
                      variants={staggerItem}
                      onClick={() => navigate(item.detailPath)}
                      className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      {/* Photo or icon */}
                      {item.photoUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                          <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-lg ${iconBgMap[item.icon]} flex items-center justify-center shrink-0`}>
                          {iconMap[item.icon]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground text-sm truncate">{item.type}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            statusConfig[item.status]?.bg || "bg-muted text-muted-foreground"
                          }`}>
                            {statusConfig[item.status]?.label || item.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.ref}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${item.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                          {item.amount >= 0 ? "+" : ""}{item.amount.toFixed(1)}{getCurrencySymbol()}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </motion.li>
                  ))
                )}
              </motion.ul>
            )}
          </>
        )}
      </main>
      </PageTransition>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
