import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Package, Plane, ShoppingBag, Shield, TrendingUp,
  Activity, AlertTriangle, CheckCircle, Clock, LogOut, BarChart3,
  ArrowUpRight, ArrowDownRight, Eye, RefreshCw
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { localizeCity } from "@/lib/geoLocalization";

// --- Types ---
interface AdminStats {
  total_users: number;
  total_shipments: number;
  pending_shipments: number;
  active_shipments: number;
  total_voyages: number;
  active_voyages: number;
  total_needit: number;
  pending_needit: number;
  total_demandeurs: number;
  total_voyageurs: number;
  kyc_pending: number;
  kyc_verified: number;
}

interface RecentShipment {
  id: string;
  ref_number: string;
  departure_city: string;
  arrival_city: string;
  arrival_country: string;
  size: string;
  tarif: string;
  status: string;
  insured: boolean;
  created_at: string;
}

interface UserRow {
  user_ref: string;
  full_name: string;
  kyc_status: string;
  role: string;
  created_at: string;
}

interface TimeData {
  day: string;
  count: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

// --- Stat Card ---
const StatCard = ({ icon: Icon, label, value, trend, color = "primary" }: {
  icon: any; label: string; value: number | string; trend?: number; color?: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center`}>
        <Icon size={18} className={`text-${color}`} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
  </div>
);

// --- Status Badge ---
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "En attente" },
    accepted: { bg: "bg-green-500/10", text: "text-green-600", label: "Accepté" },
    active: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Actif" },
    completed: { bg: "bg-muted", text: "text-muted-foreground", label: "Terminé" },
    verified: { bg: "bg-green-500/10", text: "text-green-600", label: "Vérifié" },
  };
  const c = config[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shipmentsOverTime, setShipmentsOverTime] = useState<TimeData[]>([]);
  const [usersOverTime, setUsersOverTime] = useState<TimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      const [statsRes, shipmentsRes, usersRes, sotRes, uotRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("admin_get_recent_shipments", { _limit: 20 }),
        supabase.rpc("admin_list_users", { _limit: 50, _offset: 0 }),
        supabase.rpc("admin_get_shipments_over_time"),
        supabase.rpc("admin_get_users_over_time"),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as AdminStats);
      if (shipmentsRes.data) setRecentShipments(shipmentsRes.data as unknown as RecentShipment[]);
      if (usersRes.data) setUsers(usersRes.data as unknown as UserRow[]);
      if (sotRes.data) setShipmentsOverTime(sotRes.data as unknown as TimeData[]);
      if (uotRes.data) setUsersOverTime(uotRes.data as unknown as TimeData[]);
    } catch (err) {
      toast.error("Erreur de chargement des données admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  const roleDistribution = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Demandeurs", value: stats.total_demandeurs },
      { name: "Voyageurs", value: stats.total_voyageurs },
    ];
  }, [stats]);

  const kycDistribution = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Vérifié", value: stats.kyc_verified },
      { name: "En attente", value: stats.kyc_pending },
    ];
  }, [stats]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
    catch { return d; }
  };
  const formatDateTime = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement du panneau admin…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield size={22} className="text-primary" /> Admin
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Tableau de bord d'administration</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <RefreshCw size={16} className={`text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => { signOut(); navigate("/"); }}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <LogOut size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Users} label="Utilisateurs" value={stats?.total_users ?? 0} color="primary" />
          <StatCard icon={Package} label="Colis total" value={stats?.total_shipments ?? 0} color="secondary" />
          <StatCard icon={Plane} label="Voyages actifs" value={stats?.active_voyages ?? 0} color="accent" />
          <StatCard icon={ShoppingBag} label="Missions NeedIt" value={stats?.total_needit ?? 0} color="primary" />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Clock} label="Colis en attente" value={stats?.pending_shipments ?? 0} color="secondary" />
          <StatCard icon={Activity} label="Colis acceptés" value={stats?.active_shipments ?? 0} color="primary" />
          <StatCard icon={CheckCircle} label="KYC vérifiés" value={stats?.kyc_verified ?? 0} color="accent" />
          <StatCard icon={AlertTriangle} label="KYC en attente" value={stats?.kyc_pending ?? 0} color="secondary" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="w-full bg-muted/70 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="analytics" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 size={13} className="mr-1" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="shipments" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package size={13} className="mr-1" /> Colis
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users size={13} className="mr-1" /> Utilisateurs
            </TabsTrigger>
          </TabsList>

          {/* ---- Analytics ---- */}
          <TabsContent value="analytics" className="space-y-6 mt-0">
            {/* Shipments over time */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Envois (30 derniers jours)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={shipmentsOverTime}>
                    <defs>
                      <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorShipments)" name="Envois" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Users over time */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users size={14} className="text-secondary" /> Inscriptions (30 derniers jours)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} name="Inscriptions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Répartition des rôles</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                        {roleDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-1">
                  {roleDistribution.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Statut KYC</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={kycDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                        <Cell fill="hsl(var(--accent))" />
                        <Cell fill="hsl(var(--muted-foreground))" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-1">
                  {kycDistribution.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ---- Shipments ---- */}
          <TabsContent value="shipments" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Derniers envois</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5">Réf.</th>
                      <th className="px-4 py-2.5">Trajet</th>
                      <th className="px-4 py-2.5">Taille</th>
                      <th className="px-4 py-2.5">Tarif</th>
                      <th className="px-4 py-2.5">Statut</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentShipments.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun envoi</td></tr>
                    ) : recentShipments.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono font-medium text-foreground">{s.ref_number}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">
                          {s.departure_city ? localizeCity(s.departure_city) : "—"} → {localizeCity(s.arrival_city)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">{s.size}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-foreground">{s.tarif}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ---- Users ---- */}
          <TabsContent value="users" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Utilisateurs récents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5">Réf.</th>
                      <th className="px-4 py-2.5">Nom</th>
                      <th className="px-4 py-2.5">Rôle</th>
                      <th className="px-4 py-2.5">KYC</th>
                      <th className="px-4 py-2.5">Inscription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun utilisateur</td></tr>
                    ) : users.map((u, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono font-medium text-foreground">{u.user_ref}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">{u.full_name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.role === "voyageur" ? "bg-secondary/10 text-secondary" :
                            u.role === "admin" ? "bg-primary/10 text-primary" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={u.kyc_status} /></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
