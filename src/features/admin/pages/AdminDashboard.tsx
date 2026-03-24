import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Package, Plane, ShoppingBag, Shield, TrendingUp, Activity, AlertTriangle, CheckCircle, Clock, LogOut, BarChart3, ArrowUpRight, ArrowDownRight, Eye, RefreshCw, ShieldAlert, Camera, Gavel, DollarSign, MessageSquare, Send, ImagePlus, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { localizeCity } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";

interface AdminStats { total_users: number; total_shipments: number; pending_shipments: number; active_shipments: number; total_voyages: number; active_voyages: number; total_needit: number; pending_needit: number; total_demandeurs: number; total_voyageurs: number; kyc_pending: number; kyc_verified: number; }
interface RecentShipment { id: string; ref_number: string; departure_city: string; arrival_city: string; arrival_country: string; size: string; tarif: string; status: string; insured: boolean; created_at: string; }
interface UserRow { user_ref: string; full_name: string; kyc_status: string; role: string; created_at: string; }
interface TimeData { day: string; count: number; }
interface FraudCheck { id: string; shipment_id: string; user_id: string; photo_url: string; result: string; confidence: number | null; details: string | null; created_at: string; reporter_name: string; shipment_ref: string; }
interface DisputeRow { id: string; shipment_id: string; user_id: string; reason: string; description: string; photo_url: string | null; status: string; resolution: string | null; created_at: string; reporter_name: string; shipment_ref: string; }
const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

const StatCard = ({ icon: Icon, label, value, trend, color = "primary" }: { icon: any; label: string; value: number | string; trend?: number; color?: string; }) => (
  <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center`}><Icon size={18} className={`text-${color}`} /></div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shipmentsOverTime, setShipmentsOverTime] = useState<TimeData[]>([]);
  const [usersOverTime, setUsersOverTime] = useState<TimeData[]>([]);
  const [fraudChecks, setFraudChecks] = useState<FraudCheck[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [disputeMessages, setDisputeMessages] = useState<Record<string, any[]>>({});
  const [expandedDisputeHistory, setExpandedDisputeHistory] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyPhoto, setReplyPhoto] = useState<File | null>(null);
  const [replyPhotoPreview, setReplyPhotoPreview] = useState<string | null>(null);
  const replyPhotoRef = useRef<HTMLInputElement>(null);
  const [disputeStats, setDisputeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: t("admin.pending") },
      accepted: { bg: "bg-green-500/10", text: "text-green-600", label: t("status.accepted") },
      active: { bg: "bg-blue-500/10", text: "text-blue-600", label: t("status.active") },
      completed: { bg: "bg-muted", text: "text-muted-foreground", label: t("status.completed") },
      verified: { bg: "bg-green-500/10", text: "text-green-600", label: t("admin.verified") },
    };
    const c = config[status] || { bg: "bg-muted", text: "text-muted-foreground", label: status };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const loadAll = async () => {
    try {
      const [statsRes, shipmentsRes, usersRes, sotRes, uotRes, fraudRes, disputesRes, dStatsRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("admin_get_recent_shipments", { _limit: 20 }),
        supabase.rpc("admin_list_users", { _limit: 50, _offset: 0 }),
        supabase.rpc("admin_get_shipments_over_time"),
        supabase.rpc("admin_get_users_over_time"),
        supabase.rpc("admin_get_fraud_checks" as any, { _limit: 50 }),
        supabase.rpc("admin_get_disputes" as any, { _limit: 50 }),
        supabase.rpc("admin_get_dispute_stats" as any),
      ]);
      if (dStatsRes.data) setDisputeStats(dStatsRes.data);
      if (statsRes.data) setStats(statsRes.data as unknown as AdminStats);
      if (shipmentsRes.data) setRecentShipments(shipmentsRes.data as unknown as RecentShipment[]);
      if (usersRes.data) setUsers(usersRes.data as unknown as UserRow[]);
      if (sotRes.data) setShipmentsOverTime(sotRes.data as unknown as TimeData[]);
      if (uotRes.data) setUsersOverTime(uotRes.data as unknown as TimeData[]);
      if (fraudRes.data) setFraudChecks(fraudRes.data as unknown as FraudCheck[]);
      if (disputesRes.data) {
        const disputeData = disputesRes.data as unknown as DisputeRow[];
        setDisputes(disputeData);
        // Load all dispute messages
        if (disputeData.length > 0) {
          const { data: msgs } = await supabase
            .from("dispute_messages" as any)
            .select("*")
            .in("dispute_id", disputeData.map(d => d.id))
            .order("created_at", { ascending: true });
          if (msgs) {
            const grouped: Record<string, any[]> = {};
            (msgs as any[]).forEach((msg: any) => {
              if (!grouped[msg.dispute_id]) grouped[msg.dispute_id] = [];
              grouped[msg.dispute_id].push(msg);
            });
            setDisputeMessages(grouped);
          }
        }
      }
    } catch (err) { toast.error(t("admin.loadError")); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadAll();

    // Realtime subscription for dispute messages
    const channel = supabase
      .channel('dispute-messages-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispute_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setDisputeMessages((prev) => {
            const existing = prev[newMsg.dispute_id] || [];
            if (existing.some((m: any) => m.id === newMsg.id)) return prev;
            return { ...prev, [newMsg.dispute_id]: [...existing, newMsg] };
          });
          if (newMsg.sender_role === "user") {
            toast.info("📩 Nouveau message d'un demandeur sur un litige");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast.success(t("admin.dataRefreshed"));
  };

  const handleDisputeAction = async (disputeId: string, action: "resolve" | "refund") => {
    setResolvingId(disputeId);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-dispute", {
        body: { dispute_id: disputeId, action },
      });
      if (error) throw error;
      toast.success(action === "refund" ? "Remboursement effectué" : "Litige résolu");
      setReplyingId(null);
      setReplyText("");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du traitement");
    } finally {
      setResolvingId(null);
    }
  };

  const uploadAdminPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `disputes/admin/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("shipment-photos").upload(path, file);
    if (error) return null;
    const { data } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  };

  const handleDisputeReply = async (disputeId: string) => {
    if (!replyText.trim() && !replyPhoto) {
      toast.error("Veuillez saisir une réponse ou joindre une photo");
      return;
    }
    setSendingReply(true);
    try {
      let photoUrl: string | null = null;
      if (replyPhoto) {
        photoUrl = await uploadAdminPhoto(replyPhoto);
      }

      const { error } = await supabase.functions.invoke("resolve-dispute", {
        body: {
          dispute_id: disputeId,
          action: "respond",
          admin_response: replyText.trim() || (photoUrl ? "📷 Photo jointe" : ""),
          photo_url: photoUrl,
        },
      });
      if (error) throw error;
      toast.success("Réponse envoyée au demandeur par email et notification");
      setReplyingId(null);
      setReplyText("");
      setReplyPhoto(null);
      setReplyPhotoPreview(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSendingReply(false);
    }
  };

  const roleDistribution = useMemo(() => stats ? [{ name: t("admin.demandeurs"), value: stats.total_demandeurs }, { name: t("admin.voyageurs"), value: stats.total_voyageurs }] : [], [stats, t]);
  const kycDistribution = useMemo(() => stats ? [{ name: t("admin.verified"), value: stats.kyc_verified }, { name: t("admin.pending"), value: stats.kyc_pending }] : [], [stats, t]);

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch { return d; } };
  const formatDateTime = (d: string) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return d; } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center space-y-3"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm text-muted-foreground">{t("admin.loadingAdmin")}</p></div></div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield size={22} className="text-primary" /> {t("admin.title")}</h1><p className="text-xs text-muted-foreground mt-0.5">{t("admin.subtitle")}</p></div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><RefreshCw size={16} className={`text-muted-foreground ${refreshing ? "animate-spin" : ""}`} /></button>
            <button onClick={() => { signOut(); navigate("/"); }} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"><LogOut size={16} className="text-muted-foreground" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Users} label={t("admin.users")} value={stats?.total_users ?? 0} color="primary" />
          <StatCard icon={Package} label={t("admin.totalParcels")} value={stats?.total_shipments ?? 0} color="secondary" />
          <StatCard icon={Plane} label={t("admin.activeTrips")} value={stats?.active_voyages ?? 0} color="accent" />
          <StatCard icon={ShoppingBag} label={t("admin.needitMissions")} value={stats?.total_needit ?? 0} color="primary" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Clock} label={t("admin.pendingParcels")} value={stats?.pending_shipments ?? 0} color="secondary" />
          <StatCard icon={Activity} label={t("admin.acceptedParcels")} value={stats?.active_shipments ?? 0} color="primary" />
          <StatCard icon={CheckCircle} label={t("admin.kycVerified")} value={stats?.kyc_verified ?? 0} color="accent" />
          <StatCard icon={AlertTriangle} label={t("admin.kycPending")} value={stats?.kyc_pending ?? 0} color="secondary" />
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="w-full bg-muted/70 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="analytics" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BarChart3 size={13} className="mr-1" /> {t("admin.analytics")}</TabsTrigger>
            <TabsTrigger value="shipments" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package size={13} className="mr-1" /> {t("admin.parcels")}</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users size={13} className="mr-1" /> {t("admin.users")}</TabsTrigger>
            <TabsTrigger value="fraud" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground relative">
              <ShieldAlert size={13} className="mr-1" /> Fraude
              {fraudChecks.filter(f => f.result === "fraudulent" || f.result === "suspicious").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {fraudChecks.filter(f => f.result === "fraudulent" || f.result === "suspicious").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-warning data-[state=active]:text-warning-foreground relative">
              <Gavel size={13} className="mr-1" /> Litiges
              {disputes.filter(d => d.status === "open" || d.status === "investigating").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold flex items-center justify-center">
                  {disputes.filter(d => d.status === "open" || d.status === "investigating").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6 mt-0">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> {t("admin.shipments30")}</h3>
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={shipmentsOverTime}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="hsl(var(--primary))" /></AreaChart></ResponsiveContainer></div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Users size={14} className="text-secondary" /> {t("admin.signups30")}</h3>
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={usersOverTime}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /><Bar dataKey="count" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.roleDistribution")}</h3>
                <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">{roleDistribution.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /></PieChart></ResponsiveContainer></div>
                <div className="flex justify-center gap-4 mt-1">{roleDistribution.map((d, i) => (<span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />{d.name} ({d.value})</span>))}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.kycStatus")}</h3>
                <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={kycDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value"><Cell fill="hsl(var(--accent))" /><Cell fill="hsl(var(--muted-foreground))" /></Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /></PieChart></ResponsiveContainer></div>
                <div className="flex justify-center gap-4 mt-1">{kycDistribution.map((d, i) => (<span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }} />{d.name} ({d.value})</span>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">{t("admin.recentShipments")}</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider"><th className="px-4 py-2.5">{t("admin.ref")}</th><th className="px-4 py-2.5">{t("admin.route")}</th><th className="px-4 py-2.5">{t("admin.size")}</th><th className="px-4 py-2.5">{t("admin.tariff")}</th><th className="px-4 py-2.5">{t("common.status")}</th><th className="px-4 py-2.5">{t("admin.date")}</th></tr></thead>
                  <tbody>
                    {recentShipments.length === 0 ? (<tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.noShipments")}</td></tr>) : recentShipments.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono font-medium text-foreground">{s.ref_number}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">{s.departure_city ? localizeCity(s.departure_city) : "—"} → {localizeCity(s.arrival_city)}</td>
                        <td className="px-4 py-2.5"><span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">{s.size}</span></td>
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

          <TabsContent value="users" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">{t("admin.recentUsers")}</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider"><th className="px-4 py-2.5">{t("admin.ref")}</th><th className="px-4 py-2.5">{t("admin.name")}</th><th className="px-4 py-2.5">{t("admin.role")}</th><th className="px-4 py-2.5">KYC</th><th className="px-4 py-2.5">{t("admin.registration")}</th></tr></thead>
                  <tbody>
                    {users.length === 0 ? (<tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.noUsers")}</td></tr>) : users.map((u, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono font-medium text-foreground">{u.user_ref}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground">{u.full_name || "—"}</td>
                        <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === "voyageur" ? "bg-secondary/10 text-secondary" : u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{u.role}</span></td>
                        <td className="px-4 py-2.5"><StatusBadge status={u.kyc_status} /></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fraud" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldAlert size={14} className="text-destructive" /> Détection de fraude IA</h3>
                <span className="text-xs text-muted-foreground">{fraudChecks.length} analyse(s)</span>
              </div>
              {fraudChecks.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune analyse de fraude</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {fraudChecks.map((fc) => {
                    const resultConfig: Record<string, { bg: string; text: string; label: string }> = {
                      fraudulent: { bg: "bg-destructive/10", text: "text-destructive", label: "🚨 FRAUDE" },
                      suspicious: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "⚠️ Suspect" },
                      clean: { bg: "bg-green-500/10", text: "text-green-600", label: "✅ Validé" },
                      pending: { bg: "bg-muted", text: "text-muted-foreground", label: "⏳ En cours" },
                    };
                    const rc = resultConfig[fc.result] || resultConfig.pending;
                    return (
                      <div key={fc.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          {fc.photo_url ? (
                            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                              <img src={fc.photo_url} alt="Preuve" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0"><Camera size={18} className="text-muted-foreground" /></div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-medium text-foreground">{fc.shipment_ref}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rc.bg} ${rc.text}`}>{rc.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Par : {fc.reporter_name}</p>
                            {fc.confidence !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Confiance :</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                                  <div
                                    className={`h-full rounded-full ${fc.result === "fraudulent" ? "bg-destructive" : fc.result === "suspicious" ? "bg-yellow-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(fc.confidence * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-foreground">{(fc.confidence * 100).toFixed(0)}%</span>
                              </div>
                            )}
                            {fc.details && <p className="text-xs text-muted-foreground line-clamp-2">{fc.details}</p>}
                            <p className="text-[10px] text-muted-foreground">{formatDateTime(fc.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-3 mt-0">
            {/* Dispute Statistics */}
            {disputeStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={AlertTriangle} label="Ouverts" value={disputeStats.open ?? 0} color="warning" />
                <StatCard icon={Eye} label="En cours / Escaladés" value={disputeStats.investigating ?? 0} color="primary" />
                <StatCard icon={CheckCircle} label="Résolus" value={disputeStats.resolved ?? 0} color="accent" />
                <StatCard icon={Clock} label="Temps moy. résolution" value={`${disputeStats.avg_resolution_hours ?? 0}h`} color="secondary" />
              </div>
            )}
            {disputeStats && (disputeStats.total_ratings > 0 || disputeStats.avg_satisfaction > 0) && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-lg">⭐</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Satisfaction post-résolution : {disputeStats.avg_satisfaction}/5</p>
                  <p className="text-xs text-muted-foreground">{disputeStats.total_ratings} évaluation(s) reçue(s)</p>
                </div>
              </div>
            )}
            {/* Disputes over time chart */}
            {disputes.length > 0 && (() => {
              const byDay: Record<string, number> = {};
              disputes.forEach(d => {
                const day = new Date(d.created_at).toISOString().slice(0, 10);
                byDay[day] = (byDay[day] || 0) + 1;
              });
              const chartData = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
              return (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-warning" /> Évolution des litiges</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tickFormatter={(d: string) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch { return d; } }} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <Tooltip labelFormatter={(d: string) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                        <Bar dataKey="count" name="Litiges" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Gavel size={14} className="text-warning" /> Litiges en cours</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-lg gap-1"
                    onClick={() => {
                      const headers = ["Réf", "Motif", "Statut", "Signalé par", "Date", "Résolution"];
                      const rows = disputes.map(d => [
                        d.shipment_ref,
                        d.reason,
                        d.status,
                        d.reporter_name,
                        new Date(d.created_at).toLocaleDateString("fr-FR"),
                        d.resolution || "",
                      ]);
                      const statsRow = disputeStats ? [
                        "", "", "", "", "",
                        `Ouverts: ${disputeStats.open} | Résolus: ${disputeStats.resolved} | Temps moy: ${disputeStats.avg_resolution_hours}h | Satisfaction: ${disputeStats.avg_satisfaction}/5`,
                      ] : [];
                      const csv = [headers, ...rows, [], statsRow].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `litiges_export_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={12} /> Export CSV
                  </Button>
                  <span className="text-xs text-muted-foreground">{disputes.filter(d => d.status === "open" || d.status === "investigating").length} actif(s)</span>
                </div>
              </div>
              {disputes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun litige signalé</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {disputes.map((d) => {
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      open: { bg: "bg-warning/10", text: "text-warning", label: "⏳ Ouvert" },
                      investigating: { bg: "bg-primary/10", text: "text-primary", label: "🔍 En cours" },
                      resolved: { bg: "bg-green-500/10", text: "text-green-600", label: "✅ Résolu" },
                      refunded: { bg: "bg-accent/10", text: "text-accent", label: "💰 Remboursé" },
                    };
                    const sc = statusConfig[d.status] || statusConfig.open;
                    const isActive = d.status === "open" || d.status === "investigating";
                    return (
                      <div key={d.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          {d.photo_url ? (
                            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                              <img src={d.photo_url} alt="Preuve" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0"><AlertTriangle size={18} className="text-warning" /></div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-medium text-foreground">{d.shipment_ref}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                            </div>
                            <p className="text-xs font-semibold text-foreground">{d.reason}</p>
                            <p className="text-xs text-muted-foreground">Par : {d.reporter_name}</p>
                            {d.description && <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
                            <p className="text-[10px] text-muted-foreground">{formatDateTime(d.created_at)}</p>

                            {/* Message history toggle */}
                            {(() => {
                              const msgs = disputeMessages[d.id] || [];
                              const isHistoryOpen = expandedDisputeHistory === d.id;
                              return (
                                <>
                                  <button
                                    onClick={() => setExpandedDisputeHistory(isHistoryOpen ? null : d.id)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                  >
                                    <MessageSquare size={12} />
                                    {msgs.length > 0 ? `Historique (${msgs.length})` : "Historique"}
                                  </button>
                                  {isHistoryOpen && (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto bg-muted/30 rounded-xl p-2">
                                      {msgs.length === 0 ? (
                                        <p className="text-[10px] text-muted-foreground italic">Aucun échange.</p>
                                      ) : msgs.map((msg: any) => (
                                        <div key={msg.id} className={`rounded-lg p-2 text-[11px] ${msg.sender_role === "admin" ? "bg-primary/5 border border-primary/20 ml-3" : "bg-background border border-border mr-3"}`}>
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className={`font-semibold ${msg.sender_role === "admin" ? "text-primary" : "text-foreground"}`}>
                                              {msg.sender_role === "admin" ? "🛡️ Admin" : "👤 Demandeur"}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">{formatDateTime(msg.created_at)}</span>
                                          </div>
                                          {msg.photo_url && (
                                            <img src={msg.photo_url} alt="Photo jointe" className="w-full max-w-[160px] rounded-lg mb-1 border border-border" />
                                          )}
                                          <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {isActive && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs rounded-lg gap-1"
                                    disabled={resolvingId === d.id}
                                    onClick={() => handleDisputeAction(d.id, "resolve")}
                                  >
                                    <CheckCircle size={12} /> Résoudre
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs rounded-lg gap-1"
                                    disabled={resolvingId === d.id}
                                    onClick={() => handleDisputeAction(d.id, "refund")}
                                  >
                                    <DollarSign size={12} /> Rembourser
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs rounded-lg gap-1"
                                    onClick={() => { setReplyingId(replyingId === d.id ? null : d.id); setReplyPhoto(null); setReplyPhotoPreview(null); }}
                                  >
                                    <MessageSquare size={12} /> Répondre
                                  </Button>
                                </div>
                                {replyingId === d.id && (
                                  <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                                    {replyPhotoPreview && (
                                      <div className="relative inline-block">
                                        <img src={replyPhotoPreview} alt="Photo à joindre" className="w-16 h-16 object-cover rounded-lg border border-border" />
                                        <button
                                          onClick={() => { setReplyPhoto(null); setReplyPhotoPreview(null); }}
                                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]"
                                        >×</button>
                                      </div>
                                    )}
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Répondre au demandeur (email + notification)..."
                                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                      rows={3}
                                    />
                                    <div className="flex items-center justify-between">
                                      <button
                                        onClick={() => replyPhotoRef.current?.click()}
                                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                                      >
                                        <ImagePlus size={14} className="text-muted-foreground" />
                                      </button>
                                      <input ref={replyPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) { setReplyPhoto(file); setReplyPhotoPreview(URL.createObjectURL(file)); }
                                      }} />
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs rounded-lg gap-1"
                                        disabled={sendingReply || (!replyText.trim() && !replyPhoto)}
                                        onClick={() => handleDisputeReply(d.id)}
                                      >
                                        <Send size={12} /> Envoyer
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
