import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import { Star, Package, Plane, TrendingUp, MapPin, Coins, Award, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";

const PLATFORM_RATE = 0.18;
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))"];

// Rough distance estimates between regions (km)
const DISTANCE_MAP: Record<string, number> = {
  "europe-europe": 800,
  "europe-afrique du nord": 2200,
  "europe-afrique subsaharienne": 5500,
  "europe-amérique du nord": 7000,
  "europe-asie": 8500,
  "afrique du nord-afrique subsaharienne": 3500,
  "afrique du nord-europe": 2200,
  default: 3000,
};

const getRegion = (country: string): string => {
  const c = country?.toLowerCase() || "";
  if (["france", "allemagne", "espagne", "italie", "belgique", "suisse", "portugal", "pays-bas", "royaume-uni", "uk", "poland", "pologne"].some(r => c.includes(r))) return "europe";
  if (["maroc", "algérie", "tunisie", "egypte", "libye", "morocco", "algeria", "tunisia", "egypt"].some(r => c.includes(r))) return "afrique du nord";
  if (["sénégal", "mali", "côte d'ivoire", "cameroun", "congo", "nigeria", "ghana", "senegal", "ivory coast"].some(r => c.includes(r))) return "afrique subsaharienne";
  if (["usa", "canada", "états-unis", "mexique", "united states"].some(r => c.includes(r))) return "amérique du nord";
  if (["chine", "japon", "inde", "turquie", "china", "japan", "india", "turkey", "vietnam"].some(r => c.includes(r))) return "asie";
  return "europe";
};

const estimateDistance = (from: string, to: string) => {
  const r1 = getRegion(from);
  const r2 = getRegion(to);
  const key = `${r1}-${r2}`;
  return DISTANCE_MAP[key] || DISTANCE_MAP[`${r2}-${r1}`] || DISTANCE_MAP.default;
};

interface StatisticsTabProps {
  compact?: boolean;
}

const StatisticsTab = ({ compact = false }: StatisticsTabProps) => {
  const { user } = useAuth();
  const currency = getCurrencySymbol();

  // Fetch all data via TanStack Query
  const { data: shipments = [] } = useQuery({
    queryKey: ["stats-shipments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .neq("status", "cancelled");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ["stats-missions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("needit_missions")
        .select("*")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .neq("status", "cancelled");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: voyages = [] } = useQuery({
    queryKey: ["stats-voyages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("voyages")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: rating } = useQuery({
    queryKey: ["stats-rating", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.rpc("get_user_rating", { _user_id: user.id });
      if (data && data.length > 0 && data[0].total_ratings > 0) return data[0];
      return null;
    },
    enabled: !!user,
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!user) return { totalMissions: 0, totalGains: 0, totalExpenses: 0, totalDistance: 0, deliveredCount: 0 };

    const myShipAsVoyageur = shipments.filter(s => s.voyageur_id === user.id && s.status === "delivered");
    const myMissAsVoyageur = missions.filter(m => m.voyageur_id === user.id && (m.status === "completed"));

    const voyGains = myShipAsVoyageur.reduce((sum, s) => {
      const raw = parseFloat((s.tarif || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      return sum + (isNaN(raw) ? 0 : raw * (1 - PLATFORM_RATE));
    }, 0);
    const missGains = myMissAsVoyageur.reduce((sum, m) => {
      const raw = parseFloat((m.prix_max || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      return sum + (isNaN(raw) ? 0 : raw * (1 - PLATFORM_RATE));
    }, 0);
    const gains = voyGains + missGains;

    const demShipExpenses = shipments.filter(s => s.user_id === user.id).reduce((sum, s) => {
      const raw = parseFloat((s.tarif || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      return sum + (isNaN(raw) ? 0 : raw);
    }, 0);
    const demMissExpenses = missions.filter(m => m.user_id === user.id).reduce((sum, m) => {
      const raw = parseFloat((m.prix_max || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
      return sum + (isNaN(raw) ? 0 : raw);
    }, 0);
    const expenses = demShipExpenses + demMissExpenses;

    // Distance estimation from voyages
    const totalDistance = voyages.reduce((sum, v) => {
      return sum + estimateDistance(v.departure_country, v.arrival_country);
    }, 0);

    return {
      totalMissions: shipments.length + missions.length,
      totalGains: gains,
      totalExpenses: expenses,
      totalDistance,
      deliveredCount: myShipAsVoyageur.length + myMissAsVoyageur.length,
    };
  }, [shipments, missions, voyages, user]);

  // Monthly gains chart
  const monthlyData = useMemo(() => {
    if (!user) return [];
    const months: Record<string, { gains: number; expenses: number }> = {};
    const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

    const allItems = [
      ...shipments.map(s => ({ date: s.created_at, amount: s.voyageur_id === user.id ? parseFloat((s.tarif || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) * (1 - PLATFORM_RATE) : -(parseFloat((s.tarif || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0) })),
      ...missions.map(m => ({ date: m.created_at, amount: m.voyageur_id === user.id ? parseFloat((m.prix_max || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) * (1 - PLATFORM_RATE) : -(parseFloat((m.prix_max || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0) })),
    ];

    allItems.forEach(item => {
      const d = new Date(item.date);
      const key = MONTHS[d.getMonth()];
      if (!months[key]) months[key] = { gains: 0, expenses: 0 };
      if (item.amount > 0) months[key].gains += item.amount;
      else months[key].expenses += Math.abs(item.amount);
    });

    return Object.entries(months).map(([month, vals]) => ({ month, ...vals }));
  }, [shipments, missions, user]);

  // Category distribution
  const pieData = useMemo(() => {
    return [
      { name: "Transport", value: stats.deliveredCount },
      { name: "Envois", value: shipments.filter(s => s.user_id === user?.id).length },
      { name: "NeedIt", value: missions.length },
    ].filter(d => d.value > 0);
  }, [stats, shipments, missions, user]);

  const statCards = [
    { icon: Package, label: "Missions totales", value: stats.totalMissions, color: "primary" },
    { icon: MapPin, label: "Distance estimée", value: `${(stats.totalDistance / 1000).toFixed(0)}k km`, color: "secondary" },
    { icon: Coins, label: "Gains nets", value: `${stats.totalGains.toFixed(0)}${currency}`, color: "primary" },
    { icon: Star, label: "Note moyenne", value: rating ? `${rating.average_score}/5` : "—", color: "accent" },
  ];

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact stat cards */}
        <div className="grid grid-cols-2 gap-2">
          {statCards.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-${s.color}/5 border border-${s.color}/20 rounded-2xl p-3 text-center`}
            >
              <s.icon size={16} className={`text-${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Mini bar chart */}
        {monthlyData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Évolution mensuelle</span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={monthlyData} barSize={8}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}${currency}`}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "11px" }}
                />
                <Bar dataKey="gains" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Full stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-2xl p-4 space-y-1"
          >
            <div className={`w-9 h-9 rounded-xl bg-${s.color}/10 flex items-center justify-center`}>
              <s.icon size={18} className={`text-${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Rating stars */}
      {rating && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">Note moyenne</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  className={s <= Math.round(rating.average_score) ? "text-amber-400" : "text-muted-foreground/20"}
                  fill={s <= Math.round(rating.average_score) ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-foreground">{rating.average_score}</span>
            <span className="text-sm text-muted-foreground">({rating.total_ratings} avis)</span>
          </div>
        </div>
      )}

      {/* Charts side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Répartition</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar chart */}
        {monthlyData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Gains / Dépenses</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monthlyData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}${currency}`}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "11px" }}
                />
                <Bar dataKey="gains" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-1">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Gains</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-secondary" /><span className="text-xs text-muted-foreground">Dépenses</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Distance card */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp size={24} className="text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Distance parcourue</p>
          <p className="text-xl font-bold text-foreground">{stats.totalDistance.toLocaleString("fr-FR")} km</p>
          <p className="text-xs text-muted-foreground">
            soit {(stats.totalDistance / 40075).toFixed(1)}x le tour de la Terre 🌍
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsTab;
