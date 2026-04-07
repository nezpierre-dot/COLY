import { useState, useEffect, useMemo } from "react";
import { Trophy, TrendingUp, DollarSign, Globe, ArrowUpRight, Package, ShoppingBag, Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LEVEL_STYLES } from "@/hooks/useUserPoints";

const LEVEL_COLORS: Record<string, string> = {
  green: "hsl(142, 71%, 45%)",
  gold: "hsl(45, 93%, 47%)",
  platine: "hsl(215, 14%, 55%)",
  diamant: "hsl(200, 80%, 55%)",
};

const LEVEL_ICONS: Record<string, string> = { green: "🌱", gold: "⭐", platine: "💎", diamant: "💠" };

interface LevelStats {
  by_level: { level: string; user_count: number; total_points: number }[] | null;
  total_points_distributed: number;
  total_penalties: number;
  penalty_count: number;
  avg_points: number;
}

interface ConversionStats {
  shipments: { total: number; pending: number; accepted: number; delivered: number; cancelled: number; avg_match_hours: number };
  missions: { total: number; pending: number; accepted: number; completed: number; cancelled: number };
}

interface RevenueStats {
  total_revenue: number;
  total_commission: number;
  monthly_revenue: { month: string; revenue: number; deliveries: number }[] | null;
  top_voyageurs: { voyageur_id: string; full_name: string; deliveries: number; total_earned: number }[] | null;
}

interface GeoStats {
  top_routes: { departure_city: string; arrival_city: string; arrival_country: string; shipment_count: number }[] | null;
  top_countries: { arrival_country: string; count: number }[] | null;
  active_voyages_by_country: { arrival_country: string; count: number }[] | null;
}

const AdminAnalyticsExtended = () => {
  const [levelStats, setLevelStats] = useState<LevelStats | null>(null);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [geoStats, setGeoStats] = useState<GeoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [levelRes, convRes, revRes, geoRes] = await Promise.all([
        supabase.rpc("admin_get_level_stats" as any),
        supabase.rpc("admin_get_conversion_stats" as any),
        supabase.rpc("admin_get_revenue_stats" as any),
        supabase.rpc("admin_get_geo_stats" as any),
      ]);
      if (levelRes.data) setLevelStats(levelRes.data as any);
      if (convRes.data) setConversionStats(convRes.data as any);
      if (revRes.data) setRevenueStats(revRes.data as any);
      if (geoRes.data) setGeoStats(geoRes.data as any);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const levelData = levelStats?.by_level || [];
  const shipConversion = conversionStats?.shipments;
  const missConversion = conversionStats?.missions;

  const shipFunnel = shipConversion ? [
    { name: "Total", value: shipConversion.total, color: "hsl(var(--muted-foreground))" },
    { name: "Acceptés", value: shipConversion.accepted + shipConversion.delivered, color: "hsl(var(--primary))" },
    { name: "Livrés", value: shipConversion.delivered, color: "hsl(142, 71%, 45%)" },
  ] : [];

  const missFunnel = missConversion ? [
    { name: "Total", value: missConversion.total, color: "hsl(var(--muted-foreground))" },
    { name: "Acceptées", value: missConversion.accepted + missConversion.completed, color: "hsl(var(--primary))" },
    { name: "Complétées", value: missConversion.completed, color: "hsl(142, 71%, 45%)" },
  ] : [];

  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Level Distribution */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy size={14} className="text-primary" /> Distribution des niveaux
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {levelData.map((l) => (
            <div key={l.level} className="rounded-xl border p-3 text-center" style={{ borderColor: LEVEL_COLORS[l.level] + "40", background: LEVEL_COLORS[l.level] + "10" }}>
              <span className="text-xl">{LEVEL_ICONS[l.level]}</span>
              <p className="text-lg font-bold text-foreground mt-1">{l.user_count}</p>
              <p className="text-[10px] text-muted-foreground font-medium capitalize">{l.level}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{levelStats?.total_points_distributed?.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Points distribués</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-destructive">{levelStats?.total_penalties?.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Points retirés</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{levelStats?.penalty_count}</p>
            <p className="text-[10px] text-muted-foreground">Pénalités</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{levelStats?.avg_points}</p>
            <p className="text-[10px] text-muted-foreground">Moy. points</p>
          </div>
        </div>

        {levelData.length > 0 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={levelData.map(l => ({ name: l.level, value: l.user_count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                  {levelData.map((l) => (
                    <Cell key={l.level} fill={LEVEL_COLORS[l.level]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Conversion Rates */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" /> Taux de conversion
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Shipments */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Package size={12} /> Colis
            </p>
            {shipConversion && (
              <>
                <div className="space-y-2">
                  {[
                    { label: "Pending → Accepted", pct: pct(shipConversion.accepted + shipConversion.delivered, shipConversion.total), color: "bg-primary" },
                    { label: "Accepted → Delivered", pct: pct(shipConversion.delivered, shipConversion.accepted + shipConversion.delivered), color: "bg-accent" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{s.label}</span>
                        <span className="font-bold text-foreground">{s.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={10} />
                  <span>Temps moyen de matching : <strong className="text-foreground">{shipConversion.avg_match_hours}h</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <XCircle size={10} className="text-destructive" />
                  <span>Annulés : <strong className="text-foreground">{shipConversion.cancelled}</strong> ({pct(shipConversion.cancelled, shipConversion.total)}%)</span>
                </div>
              </>
            )}
          </div>

          {/* Missions */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag size={12} /> Missions NeedIt
            </p>
            {missConversion && (
              <>
                <div className="space-y-2">
                  {[
                    { label: "Pending → Accepted", pct: pct(missConversion.accepted + missConversion.completed, missConversion.total), color: "bg-primary" },
                    { label: "Accepted → Completed", pct: pct(missConversion.completed, missConversion.accepted + missConversion.completed), color: "bg-accent" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{s.label}</span>
                        <span className="font-bold text-foreground">{s.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <XCircle size={10} className="text-destructive" />
                  <span>Annulées : <strong className="text-foreground">{missConversion.cancelled}</strong> ({pct(missConversion.cancelled, missConversion.total)}%)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DollarSign size={14} className="text-primary" /> Revenus & Commissions
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-foreground">{revenueStats?.total_revenue?.toLocaleString()} €</p>
            <p className="text-xs text-muted-foreground">Revenus bruts</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-foreground">{revenueStats?.total_commission?.toLocaleString()} €</p>
            <p className="text-xs text-muted-foreground">Commissions (15%)</p>
          </div>
        </div>

        {revenueStats?.monthly_revenue && revenueStats.monthly_revenue.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Revenus mensuels</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...revenueStats.monthly_revenue].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Revenus (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {revenueStats?.top_voyageurs && revenueStats.top_voyageurs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top voyageurs par revenus</p>
            <div className="space-y-2">
              {revenueStats.top_voyageurs.slice(0, 5).map((v, i) => (
                <div key={v.voyageur_id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-xs font-medium text-foreground">{v.full_name || "Anonyme"}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{v.total_earned?.toLocaleString()} €</p>
                    <p className="text-[10px] text-muted-foreground">{v.deliveries} livraisons</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Geographic */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe size={14} className="text-primary" /> Flux géographiques
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top destinations (colis)</p>
            <div className="space-y-1.5">
              {geoStats?.top_countries?.slice(0, 8).map((c, i) => (
                <div key={c.arrival_country} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground">{c.arrival_country}</span>
                  <span className="text-xs font-bold text-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Voyages actifs par pays</p>
            <div className="space-y-1.5">
              {geoStats?.active_voyages_by_country?.slice(0, 8).map((c) => (
                <div key={c.arrival_country} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground">{c.arrival_country}</span>
                  <span className="text-xs font-bold text-primary">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {geoStats?.top_routes && geoStats.top_routes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top routes</p>
            <div className="space-y-1.5">
              {geoStats.top_routes.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <MapPin size={10} className="text-muted-foreground" />
                    <span>{r.departure_city} → {r.arrival_city}</span>
                    <span className="text-muted-foreground">({r.arrival_country})</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{r.shipment_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsExtended;
