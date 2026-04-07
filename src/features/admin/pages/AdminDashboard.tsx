import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Package, Plane, ShoppingBag, Shield, TrendingUp, Activity, AlertTriangle, CheckCircle, Clock, LogOut, BarChart3, ArrowUpRight, ArrowDownRight, Eye, RefreshCw, ShieldAlert, Camera, Gavel, DollarSign, MessageSquare, Send, ImagePlus, Download, Headphones, X, Archive, Link2, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { localizeCity } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";
import AdminAnalyticsExtended from "@/features/admin/components/AdminAnalyticsExtended";
import AdminConfigPanel from "@/features/admin/components/AdminConfigPanel";

interface AdminStats { total_users: number; total_shipments: number; pending_shipments: number; active_shipments: number; total_voyages: number; active_voyages: number; total_needit: number; pending_needit: number; total_demandeurs: number; total_voyageurs: number; kyc_pending: number; kyc_verified: number; }
interface RecentShipment { id: string; ref_number: string; departure_city: string; arrival_city: string; arrival_country: string; size: string; tarif: string; status: string; insured: boolean; created_at: string; }
interface UserRow { user_ref: string; full_name: string; kyc_status: string; role: string; created_at: string; }
interface TimeData { day: string; count: number; }
interface FraudCheck { id: string; shipment_id: string; user_id: string; photo_url: string; result: string; confidence: number | null; details: string | null; created_at: string; reporter_name: string; shipment_ref: string; }
interface DisputeRow { id: string; shipment_id: string; user_id: string; reason: string; description: string; photo_url: string | null; status: string; resolution: string | null; created_at: string; reporter_name: string; shipment_ref: string; }
interface SupportTicket { id: string; user_id: string; subject: string; message: string; category: string; status: string; admin_reply: string | null; replied_at: string | null; created_at: string; updated_at: string; reporter_name: string; reporter_email: string; }
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
  const [disputePeriod, setDisputePeriod] = useState<number>(30);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportReplyingId, setSupportReplyingId] = useState<string | null>(null);
  const [supportReplyText, setSupportReplyText] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportClosingId, setSupportClosingId] = useState<string | null>(null);
  const [proofStats, setProofStats] = useState<{ total: number; verified: number; unverified: number }>({ total: 0, verified: 0, unverified: 0 });
  const [cancelledArchive, setCancelledArchive] = useState<any[]>([]);
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Admin manual matching state
  const [matchPendingShipments, setMatchPendingShipments] = useState<any[]>([]);
  const [matchPendingMissions, setMatchPendingMissions] = useState<any[]>([]);
  const [matchActiveVoyages, setMatchActiveVoyages] = useState<any[]>([]);
  const [matchSelectedItem, setMatchSelectedItem] = useState<{ type: "shipment" | "mission"; id: string; label: string } | null>(null);
  const [matchSearchQuery, setMatchSearchQuery] = useState("");
  const [matchAssigning, setMatchAssigning] = useState<string | null>(null);

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
      const [statsRes, shipmentsRes, usersRes, sotRes, uotRes, fraudRes, disputesRes, dStatsRes, supportRes, proofTotalRes, proofVerifiedRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("admin_get_recent_shipments", { _limit: 20 }),
        supabase.rpc("admin_list_users", { _limit: 50, _offset: 0 }),
        supabase.rpc("admin_get_shipments_over_time"),
        supabase.rpc("admin_get_users_over_time"),
        supabase.rpc("admin_get_fraud_checks" as any, { _limit: 50 }),
        supabase.rpc("admin_get_disputes" as any, { _limit: 50 }),
        supabase.rpc("admin_get_dispute_stats" as any),
        supabase.rpc("admin_get_support_tickets" as any, { _limit: 50 }),
        supabase.from("proof_verifications" as any).select("id", { count: "exact", head: true }),
        supabase.from("proof_verifications" as any).select("id", { count: "exact", head: true }).not("verified_at", "is", null),
      ]);
      const totalProofs = proofTotalRes.count ?? 0;
      const verifiedProofs = proofVerifiedRes.count ?? 0;
      setProofStats({ total: totalProofs, verified: verifiedProofs, unverified: totalProofs - verifiedProofs });
      // Load cancelled matches archive
      const { data: archiveData } = await supabase.from("cancelled_matches_archive" as any).select("*").order("cancelled_at", { ascending: false }).limit(100);
      if (archiveData) setCancelledArchive(archiveData as any[]);
      if (dStatsRes.data) setDisputeStats(dStatsRes.data);
      if (supportRes.data) setSupportTickets(supportRes.data as unknown as SupportTicket[]);
      if (statsRes.data) setStats(statsRes.data as unknown as AdminStats);
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
      // Load matching data
      const [pendShipRes, pendMissRes, activeVoyRes] = await Promise.all([
        supabase.rpc("get_pending_shipments"),
        supabase.rpc("get_pending_needit_missions"),
        supabase.from("voyages").select("id, user_id, departure_city, departure_country, arrival_city, arrival_country, departure_date, transport_method, status").eq("status", "active").order("departure_date", { ascending: true }),
      ]);
      if (pendShipRes.data) setMatchPendingShipments(pendShipRes.data as any[]);
      if (pendMissRes.data) setMatchPendingMissions(pendMissRes.data as any[]);
      if (activeVoyRes.data) setMatchActiveVoyages(activeVoyRes.data as any[]);
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
  const proofDistribution = useMemo(() => [{ name: "Vérifiées", value: proofStats.verified }, { name: "Non vérifiées", value: proofStats.unverified }], [proofStats]);

  const handleSupportReply = async (ticketId: string) => {
    if (!supportReplyText.trim()) { toast.error("Veuillez saisir une réponse"); return; }
    setSupportSending(true);
    try {
      const { error } = await supabase.functions.invoke("admin-support-ticket", {
        body: { ticket_id: ticketId, action: "reply", reply: supportReplyText.trim() },
      });
      if (error) throw error;
      toast.success("Réponse envoyée par email et notification");
      setSupportReplyingId(null);
      setSupportReplyText("");
      await loadAll();
    } catch (err: any) { toast.error(err.message || "Erreur"); } finally { setSupportSending(false); }
  };

  const handleSupportClose = async (ticketId: string) => {
    setSupportClosingId(ticketId);
    try {
      const { error } = await supabase.functions.invoke("admin-support-ticket", {
        body: { ticket_id: ticketId, action: "close" },
      });
      if (error) throw error;
      toast.success("Ticket clôturé");
      await loadAll();
    } catch (err: any) { toast.error(err.message || "Erreur"); } finally { setSupportClosingId(null); }
  };

  const openSupportTickets = supportTickets.filter(t => t.status === "open" || t.status === "replied");

  const handleExportProofsCSV = async () => {
    try {
      const { data, error } = await supabase
        .from("proof_verifications" as any)
        .select("proof_id, shipment_id, proof_type, latitude, longitude, created_at, verified_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { toast.error("Aucune preuve à exporter"); return; }
      const headers = ["proof_id", "shipment_id", "proof_type", "latitude", "longitude", "created_at", "verified_at", "status"];
      const rows = (data as any[]).map((r: any) => [
        r.proof_id, r.shipment_id, r.proof_type,
        r.latitude ?? "", r.longitude ?? "",
        r.created_at, r.verified_at ?? "",
        r.verified_at ? "verified" : "pending",
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `preuves-verification-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("CSV exporté ✅");
    } catch { toast.error("Erreur lors de l'export"); }
  };

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
            <TabsTrigger value="support" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
              <Headphones size={13} className="mr-1" /> Support
              {openSupportTickets.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {openSupportTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archives" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
              <Archive size={13} className="mr-1" /> Archives
              {cancelledArchive.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground text-background text-[10px] font-bold flex items-center justify-center">
                  {cancelledArchive.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground relative">
              <Link2 size={13} className="mr-1" /> Matching
              {(matchPendingShipments.length + matchPendingMissions.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                  {matchPendingShipments.length + matchPendingMissions.length}
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

            {/* Proof Verification Stats */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Camera size={14} className="text-primary" /> Vérification des preuves QR
                </h3>
                {proofStats.total > 0 && (
                  <button
                    onClick={handleExportProofsCSV}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <Download size={12} /> Export CSV
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{proofStats.total}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Total preuves</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{proofStats.verified}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Vérifiées</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-yellow-600">{proofStats.unverified}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Non vérifiées</p>
                </div>
              </div>
              {proofStats.total > 0 && (
                <div className="flex items-center gap-4">
                  <div className="h-32 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={proofDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                          <Cell fill="hsl(142, 71%, 45%)" />
                          <Cell fill="hsl(48, 96%, 53%)" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                      Vérifiées ({proofStats.total > 0 ? Math.round((proofStats.verified / proofStats.total) * 100) : 0}%)
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(48, 96%, 53%)" }} />
                      Non vérifiées ({proofStats.total > 0 ? Math.round((proofStats.unverified / proofStats.total) * 100) : 0}%)
                    </div>
                  </div>
                </div>
              )}
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
              const cutoff = new Date(Date.now() - disputePeriod * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
              const filtered = disputes.filter(d => new Date(d.created_at).toISOString().slice(0, 10) >= cutoff);
              const byDay: Record<string, number> = {};
              filtered.forEach(d => {
                const day = new Date(d.created_at).toISOString().slice(0, 10);
                byDay[day] = (byDay[day] || 0) + 1;
              });
              const chartData = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
              return (
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp size={14} className="text-warning" /> Évolution des litiges</h3>
                    <div className="flex gap-1">
                      {[{ label: "7j", value: 7 }, { label: "30j", value: 30 }, { label: "90j", value: 90 }].map(p => (
                        <button
                          key={p.value}
                          onClick={() => setDisputePeriod(p.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${disputePeriod === p.value ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
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

          {/* Support Tickets Tab */}
          <TabsContent value="support" className="space-y-4 mt-0">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Headphones size={14} className="text-primary" /> Tickets support ({supportTickets.length})
              </h3>
              {supportTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun ticket de support</p>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map((ticket) => {
                    const statusCfg: Record<string, { label: string; cls: string }> = {
                      open: { label: "Nouveau", cls: "bg-amber-500/10 text-amber-600" },
                      replied: { label: "Répondu", cls: "bg-emerald-500/10 text-emerald-600" },
                      closed: { label: "Clôturé", cls: "bg-muted text-muted-foreground" },
                    };
                    const cfg = statusCfg[ticket.status] || statusCfg.open;
                    const isReplying = supportReplyingId === ticket.id;
                    return (
                      <div key={ticket.id} className="border border-border rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{ticket.category}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground mt-1">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ticket.reporter_name} · {ticket.reporter_email} · {formatDateTime(ticket.created_at)}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">SUP-{ticket.id.slice(0, 8).toUpperCase()}</span>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.message}</p>
                        </div>

                        {ticket.admin_reply && (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary mb-1">Votre réponse</p>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.admin_reply}</p>
                            {ticket.replied_at && (
                              <p className="text-xs text-muted-foreground mt-1">{formatDateTime(ticket.replied_at)}</p>
                            )}
                          </div>
                        )}

                        {ticket.status !== "closed" && (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant={isReplying ? "outline" : "default"}
                              onClick={() => { setSupportReplyingId(isReplying ? null : ticket.id); setSupportReplyText(ticket.admin_reply || ""); }}
                              className="text-xs"
                            >
                              <MessageSquare size={12} className="mr-1" /> {isReplying ? "Annuler" : "Répondre"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSupportClose(ticket.id)}
                              disabled={supportClosingId === ticket.id}
                              className="text-xs"
                            >
                              <CheckCircle size={12} className="mr-1" /> {supportClosingId === ticket.id ? "..." : "Clôturer"}
                            </Button>
                          </div>
                        )}

                        {isReplying && (
                          <div className="space-y-2 pt-1">
                            <textarea
                              value={supportReplyText}
                              onChange={(e) => setSupportReplyText(e.target.value)}
                              rows={3}
                              maxLength={2000}
                              placeholder="Votre réponse au ticket..."
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSupportReply(ticket.id)}
                              disabled={supportSending || !supportReplyText.trim()}
                              className="text-xs"
                            >
                              <Send size={12} className="mr-1" /> {supportSending ? "Envoi..." : "Envoyer la réponse"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="archives" className="space-y-3 mt-0">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Archive size={14} className="text-muted-foreground" /> Historique des annulations matchées
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {cancelledArchive.filter(a => archiveTypeFilter === "all" || a.item_type === archiveTypeFilter).length} entrée(s)
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                      const filtered = cancelledArchive.filter(a => archiveTypeFilter === "all" || a.item_type === archiveTypeFilter);
                      if (filtered.length === 0) { toast.error("Aucune donnée à exporter"); return; }
                      const headers = ["Type", "Départ", "Arrivée", "Pays arrivée", "Tarif", "Statut avant", "Raison", "Annulé le"];
                      const typeLabels: Record<string, string> = { shipment: "Envoi", needit_mission: "NeedIt", voyage: "Voyage" };
                      const rows = filtered.map((a: any) => [
                        typeLabels[a.item_type] || a.item_type,
                        a.departure_city || "",
                        a.arrival_city || "",
                        a.arrival_country || "",
                        a.tarif || "",
                        a.original_status || "",
                        a.reason || "",
                        a.cancelled_at ? new Date(a.cancelled_at).toLocaleString("fr-FR") : "",
                      ]);
                      const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `archives-annulations${archiveTypeFilter !== "all" ? `-${archiveTypeFilter}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(link.href);
                      toast.success("CSV exporté ✅");
                    }}>
                      <Download size={12} /> CSV
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { key: "all", label: "Tous" },
                    { key: "shipment", label: "📦 Envoi" },
                    { key: "needit_mission", label: "🛒 NeedIt" },
                    { key: "voyage", label: "✈️ Voyage" },
                  ].map(f => (
                    <button key={f.key} onClick={() => setArchiveTypeFilter(f.key)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${archiveTypeFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const filtered = cancelledArchive.filter(a => archiveTypeFilter === "all" || a.item_type === archiveTypeFilter);
                return filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune annulation matchée enregistrée</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="px-4 py-2.5">Type</th>
                          <th className="px-4 py-2.5">Trajet</th>
                          <th className="px-4 py-2.5">Tarif</th>
                          <th className="px-4 py-2.5">Statut avant</th>
                          <th className="px-4 py-2.5">Annulé le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a: any) => {
                          const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
                            shipment: { label: "📦 Envoi", bg: "bg-primary/10", text: "text-primary" },
                            needit_mission: { label: "🛒 NeedIt", bg: "bg-accent/10", text: "text-accent-foreground" },
                            voyage: { label: "✈️ Voyage", bg: "bg-secondary/10", text: "text-secondary" },
                          };
                          const tc = typeConfig[a.item_type] || { label: a.item_type, bg: "bg-muted", text: "text-muted-foreground" };
                          return (
                            <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-foreground">
                                {a.departure_city ? `${a.departure_city} → ` : ""}{a.arrival_city || a.arrival_country || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-foreground">{a.tarif || "—"}</td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{a.original_status || "—"}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(a.cancelled_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* Admin Manual Matching Tab */}
          <TabsContent value="matching" className="space-y-4 mt-0">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Link2 size={14} className="text-accent" /> Matching manuel admin
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Sélectionnez un colis ou une mission, puis assignez-le à un voyageur actif.</p>

              {/* Step 1: Select item */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-foreground mb-2">1. Choisir un élément à matcher</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {matchPendingShipments.length === 0 && matchPendingMissions.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">Aucun élément en attente</p>
                  )}
                  {matchPendingShipments.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => setMatchSelectedItem({ type: "shipment", id: s.id, label: `📦 ${s.departure_city || "?"} → ${s.arrival_city}, ${s.arrival_country} (${s.tarif})` })}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${matchSelectedItem?.id === s.id ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border hover:bg-muted"}`}
                    >
                      📦 {s.departure_city || "?"} → {s.arrival_city}, {s.arrival_country} — <span className="font-bold">{s.tarif}</span> — {s.size}
                    </button>
                  ))}
                  {matchPendingMissions.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => setMatchSelectedItem({ type: "mission", id: m.id, label: `🛒 ${m.product_name || "Mission"} → ${m.city || m.country}` })}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${matchSelectedItem?.id === m.id ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border hover:bg-muted"}`}
                    >
                      🛒 {m.product_name || "Mission NeedIt"} → {m.city || m.country} {m.prix_max ? `— Max ${m.prix_max}` : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select voyageur */}
              {matchSelectedItem && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">2. Assigner à un voyageur</p>
                  <p className="text-xs text-muted-foreground mb-2">Sélectionné : <span className="font-semibold text-foreground">{matchSelectedItem.label}</span></p>
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-2">
                    <Search size={14} className="text-muted-foreground" />
                    <input
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                      placeholder="Filtrer par ville d'arrivée..."
                      value={matchSearchQuery}
                      onChange={(e) => setMatchSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {matchActiveVoyages
                      .filter((v: any) => {
                        if (!matchSearchQuery) return true;
                        const q = matchSearchQuery.toLowerCase();
                        return v.arrival_city?.toLowerCase().includes(q) || v.arrival_country?.toLowerCase().includes(q) || v.departure_city?.toLowerCase().includes(q);
                      })
                      .map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors">
                          <div className="text-xs text-foreground">
                            ✈️ {v.departure_city} → {v.arrival_city}, {v.arrival_country} — {new Date(v.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7 px-3"
                            disabled={matchAssigning === v.id}
                            onClick={async () => {
                              setMatchAssigning(v.id);
                              try {
                                if (matchSelectedItem.type === "shipment") {
                                  const { error } = await supabase.from("shipments").update({ voyageur_id: v.user_id, status: "accepted" }).eq("id", matchSelectedItem.id);
                                  if (error) throw error;
                                } else {
                                  const { error } = await supabase.from("needit_missions").update({ voyageur_id: v.user_id, status: "accepted" }).eq("id", matchSelectedItem.id);
                                  if (error) throw error;
                                }
                                // Create notification for both parties
                                await supabase.from("notifications").insert([
                                  { user_id: v.user_id, title: "🎯 Match admin", message: `Un admin vous a assigné une demande vers ${v.arrival_city}.`, type: "match" },
                                ]);
                                toast.success("Match effectué avec succès !");
                                setMatchSelectedItem(null);
                                setMatchSearchQuery("");
                                await loadAll();
                              } catch (err: any) {
                                toast.error(err.message || "Erreur lors du match");
                              } finally {
                                setMatchAssigning(null);
                              }
                            }}
                          >
                            {matchAssigning === v.id ? "..." : "Assigner"}
                          </Button>
                        </div>
                      ))}
                    {matchActiveVoyages.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">Aucun voyage actif</p>
                    )}
                  </div>
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
