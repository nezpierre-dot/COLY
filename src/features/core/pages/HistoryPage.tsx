import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Truck, ArrowUpCircle, ShoppingBag, TrendingUp, Sparkles, Trash2 } from "lucide-react";
import SortSelect, { applySortOption, type SortOption } from "@/components/SortSelect";
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
import { toast } from "sonner";
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

type HistoryType = "voyageur" | "coly" | "needit";
type AIFilter = "all" | "best" | "losses";

interface HistoryItem {
  id: string;
  realId: string;
  dbTable: "shipments" | "needit_missions";
  type: string;
  ref: string;
  amount: number;
  date: string;
  rawDate: Date;
  category: HistoryType;
  icon: string;
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

// Platform commission rate
const PLATFORM_RATE = 0.18;

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
  const [allData, setAllData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; realId: string; dbTable: "shipments" | "needit_missions"; ref: string } | null>(null);
  const [historySort, setHistorySort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });

  const handleDeleteItem = async () => {
    if (!deleteDialog) return;
    const { error } = await supabase.from(deleteDialog.dbTable).delete().eq("id", deleteDialog.realId);
    if (error) {
      toast.error(t("dashboard.deleteError"));
    } else {
      toast.success(t("dashboard.deletedSuccess"));
      setAllData(prev => prev.filter(i => i.realId !== deleteDialog.realId));
    }
    setDeleteDialog(null);
  };

  // Classic carrier price estimate for savings comparison (per kg, rough estimate in EUR)
  const CLASSIC_RATE_PER_UNIT = 35;

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const [shipRes, missRes] = await Promise.all([
        supabase
          .from("shipments")
          .select("*")
          .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false }),
        supabase
          .from("needit_missions")
          .select("*")
          .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false }),
      ]);

      const items: HistoryItem[] = [];

      // Shipments as demandeur (expenses)
      shipRes.data?.filter(s => s.user_id === user.id).forEach((s) => {
        const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
        items.push({
          id: `s-dem-${s.id}`,
          realId: s.id,
          dbTable: "shipments",
          type: "Envoi",
          ref: `NIDIT-${s.id.slice(0, 8).toUpperCase()}`,
          amount: -raw,
          date: new Date(s.created_at).toLocaleDateString("fr-FR"),
          rawDate: new Date(s.created_at),
          category: "coly",
          icon: "envoi",
        });
      });

      // Shipments as voyageur (gains after platform commission)
      shipRes.data?.filter(s => s.voyageur_id === user.id).forEach((s) => {
        const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
        const gain = raw * (1 - PLATFORM_RATE);
        if (gain > 0) {
          items.push({
            id: `s-voy-${s.id}`,
            realId: s.id,
            dbTable: "shipments",
            type: "Transport",
            ref: `NIDIT-${s.id.slice(0, 8).toUpperCase()}`,
            amount: gain,
            date: new Date(s.created_at).toLocaleDateString("fr-FR"),
            rawDate: new Date(s.created_at),
            category: "voyageur",
            icon: "transport",
          });
        }
      });

      // NeedIt as demandeur (expenses)
      missRes.data?.filter(m => m.user_id === user.id).forEach((m) => {
        const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
        if (raw > 0) {
          items.push({
            id: `n-dem-${m.id}`,
            realId: m.id,
            dbTable: "needit_missions",
            type: "Mission NeedIt",
            ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`,
            amount: -raw,
            date: new Date(m.created_at).toLocaleDateString("fr-FR"),
            rawDate: new Date(m.created_at),
            category: "needit",
            icon: "needit",
          });
        }
      });

      // NeedIt as voyageur (gains after commission)
      missRes.data?.filter(m => m.voyageur_id === user.id).forEach((m) => {
        const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
        const gain = raw * (1 - PLATFORM_RATE);
        if (gain > 0) {
          items.push({
            id: `n-voy-${m.id}`,
            realId: m.id,
            dbTable: "needit_missions",
            type: "Mission NeedIt (gain)",
            ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`,
            amount: gain,
            date: new Date(m.created_at).toLocaleDateString("fr-FR"),
            rawDate: new Date(m.created_at),
            category: "voyageur",
            icon: "transport",
          });
        }
      });

      items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setAllData(items);
      setLoading(false);
    };

    load();
  }, [user]);

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

  // Savings: classic carrier vs platform
  const shipmentCount = allData.filter(i => i.category === "coly" && i.amount < 0).length;
  const estimatedClassic = shipmentCount * CLASSIC_RATE_PER_UNIT;
  const savings = estimatedClassic - totalExpenses;

  // Pie chart data
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

  // Monthly bar chart data
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

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    const [shipRes, missRes] = await Promise.all([
      supabase.from("shipments").select("*").or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`).neq("status", "cancelled").order("created_at", { ascending: false }),
      supabase.from("needit_missions").select("*").or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`).neq("status", "cancelled").order("created_at", { ascending: false }),
    ]);
    // Re-process same as initial load
    const items: HistoryItem[] = [];
    shipRes.data?.filter(s => s.user_id === user.id).forEach((s) => {
      const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      items.push({ id: `s-dem-${s.id}`, realId: s.id, dbTable: "shipments", type: "Envoi", ref: `NIDIT-${s.id.slice(0, 8).toUpperCase()}`, amount: -raw, date: new Date(s.created_at).toLocaleDateString("fr-FR"), rawDate: new Date(s.created_at), category: "coly", icon: "envoi" });
    });
    shipRes.data?.filter(s => s.voyageur_id === user.id).forEach((s) => {
      const raw = parseFloat(s.tarif?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      const gain = raw * (1 - PLATFORM_RATE);
      if (gain > 0) items.push({ id: `s-voy-${s.id}`, realId: s.id, dbTable: "shipments", type: "Transport", ref: `NIDIT-${s.id.slice(0, 8).toUpperCase()}`, amount: gain, date: new Date(s.created_at).toLocaleDateString("fr-FR"), rawDate: new Date(s.created_at), category: "voyageur", icon: "transport" });
    });
    missRes.data?.filter(m => m.user_id === user.id).forEach((m) => {
      const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      if (raw > 0) items.push({ id: `n-dem-${m.id}`, realId: m.id, dbTable: "needit_missions", type: "Mission NeedIt", ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`, amount: -raw, date: new Date(m.created_at).toLocaleDateString("fr-FR"), rawDate: new Date(m.created_at), category: "needit", icon: "needit" });
    });
    missRes.data?.filter(m => m.voyageur_id === user.id).forEach((m) => {
      const raw = parseFloat(m.prix_max?.replace(/[^0-9.]/g, "") ?? "0") || 0;
      const gain = raw * (1 - PLATFORM_RATE);
      if (gain > 0) items.push({ id: `n-voy-${m.id}`, realId: m.id, dbTable: "needit_missions", type: "Mission NeedIt (gain)", ref: `NEED-${m.id.slice(0, 8).toUpperCase()}`, amount: gain, date: new Date(m.created_at).toLocaleDateString("fr-FR"), rawDate: new Date(m.created_at), category: "voyageur", icon: "transport" });
    });
    items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    setAllData(items);
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
      <PageTransition>
        <main className="px-6 pt-12" id="main-content" role="main" aria-label="Historique des transactions">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="text-muted-foreground" aria-label="Retour">
            <ArrowLeft size={24} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-[26px] font-bold text-foreground leading-tight">{t("history.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("history.subtitle")}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6 foldable-grid" role="region" aria-label="Résumé financier">
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

        {/* Charts section */}
        {!loading && allData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6 foldable-grid" role="region" aria-label="Graphiques">
            {/* Pie chart */}
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

            {/* Bar chart */}
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
            aria-label="Rechercher des transactions"
          />
        </div>

        {/* AI filter pills */}
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
                <div className="w-10 h-10 bg-muted rounded-lg shrink-0" />
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
            aria-label="Liste des transactions"
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
                  className="flex items-center gap-3 bg-card rounded-xl border border-border p-3.5 hover:shadow-sm transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-lg ${iconBgMap[item.icon]} flex items-center justify-center shrink-0`}>
                    {iconMap[item.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground text-sm">{item.type}</p>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        item.category === "voyageur" ? "bg-primary/10 text-primary" :
                        item.category === "coly" ? "bg-secondary/10 text-secondary" :
                        "bg-accent/10 text-accent"
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.ref}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <p className={`font-bold text-sm ${item.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                        {item.amount >= 0 ? "+" : ""}{item.amount.toFixed(1)}{getCurrencySymbol()}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                    <button
                      onClick={() => setDeleteDialog({ id: item.id, realId: item.realId, dbTable: item.dbTable, ref: item.ref })}
                      className="w-7 h-7 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.li>
              ))
            )}
          </motion.ul>
        )}
      </main>
      </PageTransition>
      </PullToRefresh>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteDesc")}{" "}
              <span className="font-semibold text-foreground">{deleteDialog?.ref}</span>.
              {" "}{t("dashboard.deleteIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.cancelNo")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dashboard.deleteYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;
