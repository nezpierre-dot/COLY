import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Truck, ArrowUpCircle, ShoppingBag, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import BottomNav from "@/components/BottomNav";

type HistoryType = "voyageur" | "coly" | "needit";
type AIFilter = "all" | "best" | "losses";

interface HistoryItem {
  id: string;
  type: string;
  ref: string;
  amount: number;
  date: string;
  category: HistoryType;
  icon: string;
}

const ALL_DATA: HistoryItem[] = [
  { id: "v1", type: "Transport", ref: "COLY N°224513", amount: 12.9, date: "30/01/2025", category: "voyageur", icon: "transport" },
  { id: "v2", type: "Transport", ref: "Needit N°142565", amount: 40.9, date: "12/01/2025", category: "voyageur", icon: "transport" },
  { id: "v3", type: "Transport", ref: "COLY N°244365", amount: 9.2, date: "04/01/2025", category: "voyageur", icon: "transport" },
  { id: "v4", type: "Transport", ref: "COLY N°263214", amount: 13.0, date: "03/01/2025", category: "voyageur", icon: "transport" },
  { id: "v5", type: "Transport", ref: "COLY N°198734", amount: 22.5, date: "15/12/2024", category: "voyageur", icon: "transport" },
  { id: "c1", type: "Envoi", ref: "COLY N°263214", amount: -23.0, date: "03/01/2025", category: "coly", icon: "envoi" },
  { id: "c2", type: "Transport COLY", ref: "N°224513", amount: -14.2, date: "04/01/2025", category: "coly", icon: "envoi" },
  { id: "c3", type: "Envoi", ref: "COLY N°246531", amount: -44.4, date: "27/12/2024", category: "coly", icon: "envoi" },
  { id: "c4", type: "Envoi Express", ref: "COLY N°251098", amount: -32.0, date: "18/12/2024", category: "coly", icon: "envoi" },
  { id: "n1", type: "Mission NeedIt", ref: "Needit N°142565", amount: 32.9, date: "30/01/2025", category: "needit", icon: "needit" },
  { id: "n2", type: "Mission NeedIt", ref: "Needit N°143200", amount: 18.5, date: "20/01/2025", category: "needit", icon: "needit" },
  { id: "n3", type: "Mission NeedIt", ref: "Needit N°139800", amount: 55.0, date: "10/12/2024", category: "needit", icon: "needit" },
];

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const PIE_COLORS = [
  "hsl(214, 80%, 52%)",   // coly-blue
  "hsl(252, 40%, 75%)",   // coly-purple
  "hsl(33, 90%, 62%)",    // coly-orange
];

const iconMap: Record<string, React.ReactNode> = {
  transport: <Truck size={18} className="text-primary" />,
  envoi: <ArrowUpCircle size={18} className="text-coly-purple" />,
  needit: <ShoppingBag size={18} className="text-accent" />,
};

const iconBgMap: Record<string, string> = {
  transport: "bg-primary/10",
  envoi: "bg-coly-purple/10",
  needit: "bg-accent/10",
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const initialTab = (type as HistoryType) || "voyageur";

  const [activeTab, setActiveTab] = useState<HistoryType | "all">(
    ["voyageur", "coly", "needit"].includes(initialTab) ? initialTab : "all"
  );
  const [search, setSearch] = useState("");
  const [aiFilter, setAiFilter] = useState<AIFilter>("all");

  // Filtered data
  const filtered = useMemo(() => {
    let items = activeTab === "all" ? ALL_DATA : ALL_DATA.filter((i) => i.category === activeTab);

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
  }, [activeTab, search, aiFilter]);

  // Stats
  const totalGains = useMemo(() => ALL_DATA.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0), []);
  const totalExpenses = useMemo(() => ALL_DATA.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0), []);
  const netBalance = totalGains - totalExpenses;

  // Pie chart data
  const pieData = useMemo(() => {
    const voyTotal = ALL_DATA.filter((i) => i.category === "voyageur").reduce((s, i) => s + Math.abs(i.amount), 0);
    const colyTotal = ALL_DATA.filter((i) => i.category === "coly").reduce((s, i) => s + Math.abs(i.amount), 0);
    const needitTotal = ALL_DATA.filter((i) => i.category === "needit").reduce((s, i) => s + Math.abs(i.amount), 0);
    return [
      { name: "Voyageur", value: voyTotal },
      { name: "Coly", value: colyTotal },
      { name: "NeedIt", value: needitTotal },
    ];
  }, []);

  // Monthly bar chart data
  const barData = useMemo(() => {
    const months: Record<string, { gains: number; expenses: number }> = {};
    ALL_DATA.forEach((item) => {
      const parts = item.date.split("/");
      const monthIdx = parseInt(parts[1], 10) - 1;
      const key = MONTHS[monthIdx] || parts[1];
      if (!months[key]) months[key] = { gains: 0, expenses: 0 };
      if (item.amount > 0) months[key].gains += item.amount;
      else months[key].expenses += Math.abs(item.amount);
    });
    return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
  }, []);

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        <main className="px-6 pt-12" id="main-content" role="main" aria-label="Historique des transactions">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground" aria-label="Retour">
            <ArrowLeft size={24} aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-foreground flex-1">Historique</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6 foldable-grid" role="region" aria-label="Résumé financier">
          <div className="bg-primary/10 rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Gains</p>
            <p className="text-lg font-black text-primary" aria-label={`Gains: ${totalGains.toFixed(0)} euros`}>+{totalGains.toFixed(0)}€</p>
          </div>
          <div className="bg-destructive/10 rounded-2xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Dépenses</p>
            <p className="text-lg font-black text-destructive" aria-label={`Dépenses: ${totalExpenses.toFixed(0)} euros`}>-{totalExpenses.toFixed(0)}€</p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${netBalance >= 0 ? "bg-primary/5" : "bg-destructive/10"}`}>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Net</p>
            <p className={`text-lg font-black ${netBalance >= 0 ? "text-primary" : "text-destructive"}`} aria-label={`Solde net: ${netBalance.toFixed(0)} euros`}>
              {netBalance >= 0 ? "+" : ""}{netBalance.toFixed(0)}€
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setAiFilter("all"); }}>
          <TabsList className="w-full bg-muted rounded-2xl p-1 h-auto mb-4">
            <TabsTrigger value="all" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background">
              Tout
            </TabsTrigger>
            <TabsTrigger value="voyageur" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Voyageur
            </TabsTrigger>
            <TabsTrigger value="coly" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-coly-purple data-[state=active]:text-primary-foreground">
              Coly
            </TabsTrigger>
            <TabsTrigger value="needit" className="flex-1 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              NeedIt
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Charts section */}
        <div className="grid grid-cols-2 gap-3 mb-6 foldable-grid" role="region" aria-label="Graphiques">
          {/* Pie chart */}
          <div className="bg-card rounded-2xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Répartition</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}€`}
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
          <div className="bg-card rounded-2xl border border-border p-3">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Timeline</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={barData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}€`}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                />
                <Bar dataKey="gains" fill="hsl(214, 80%, 52%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(252, 40%, 75%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Gains</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-coly-purple" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Dépenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search + AI filters */}
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-3">
          <Search size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Rechercher par ref, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher des transactions"
          />
        </div>

        {/* AI filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {([
            { key: "all" as AIFilter, label: "Tout", icon: null },
            { key: "best" as AIFilter, label: "Meilleurs gains", icon: <TrendingUp size={12} /> },
            { key: "losses" as AIFilter, label: "Dépenses", icon: <Sparkles size={12} /> },
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
            {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
          </p>
          <p className={`text-lg font-bold ${total >= 0 ? "text-primary" : "text-destructive"}`}>
            {total >= 0 ? "+" : ""}{total.toFixed(2)}€
          </p>
        </div>

        {/* Transaction list */}
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2" role="list" aria-label="Liste des transactions"
        >
          {filtered.length === 0 ? (
            <li className="text-center py-12">
              <p className="text-muted-foreground text-sm" role="status">Aucune transaction trouvée</p>
            </li>
          ) : (
            filtered.map((item) => (
              <motion.li
                key={item.id}
                variants={staggerItem}
                className="flex items-center gap-3 bg-card rounded-xl border border-border p-3.5 hover:shadow-sm transition-shadow"
                aria-label={`${item.type} ${item.ref}, ${item.amount >= 0 ? "+" : ""}${item.amount.toFixed(1)} euros, ${item.date}`}
              >
                <div className={`w-10 h-10 rounded-lg ${iconBgMap[item.icon]} flex items-center justify-center shrink-0`} aria-hidden="true">
                  {iconMap[item.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-foreground text-sm">{item.type}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      item.category === "voyageur" ? "bg-primary/10 text-primary" :
                      item.category === "coly" ? "bg-coly-purple/10 text-coly-purple" :
                      "bg-accent/10 text-accent"
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${item.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                    {item.amount >= 0 ? "+" : ""}{item.amount.toFixed(1)}€
                  </p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </motion.li>
            ))
          )}
        </motion.ul>
      </main>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
