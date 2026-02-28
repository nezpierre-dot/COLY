import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Search, Filter, MapPin, Clock, Plane, Map, Heart, Sparkles, Star, TrendingUp, Package, ShoppingBag, Zap, Calendar, Users, Plus, Send, Receipt, Wallet, ChevronRight, X, Download, BarChart3, Pencil, SlidersHorizontal, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import NotificationBell from "@/components/NotificationBell";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrencyForCountry } from "@/hooks/useLocaleUnits";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import BottomNav from "@/components/BottomNav";
import VoyageMap from "@/components/VoyageMap";
import VoyageurAvailability from "@/components/VoyageurAvailability";
import PublicMissionsMap from "@/components/PublicMissionsMap";
import PullToRefresh from "@/components/PullToRefresh";
import { hapticLight } from "@/lib/haptics";

import { usePWAInstall } from "@/hooks/usePWAInstall";
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

// Dynamic voyages type
type Voyage = {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  departure_time: string | null;
  departure_address: string | null;
  transport_method: string;
  status: string;
};

// No mock data — only real DB data is displayed

// --- Voyageur Quick Stats with mini chart ---
const QuickStats = ({ voyagesCount, colisCount, matchCount, chartData }: { voyagesCount: number; colisCount: number; matchCount: number; chartData: { name: string; value: number }[] }) => {
  const stats = [
    { value: voyagesCount, label: "Voyages", gradient: "from-primary to-primary/70", textColor: "text-primary-foreground" },
    { value: colisCount, label: "Colis dispo", gradient: "from-secondary to-secondary/70", textColor: "text-secondary-foreground" },
    { value: matchCount, label: "Matchs", gradient: "from-accent to-accent/70", textColor: "text-accent-foreground" },
  ];
  return (
    <div className="space-y-3 mb-4">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-2"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={staggerItem}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-3 text-center cursor-default shadow-lg relative overflow-hidden`}
          >
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white/10" />
            <motion.p
              key={stat.value}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`text-xl font-bold ${stat.textColor}`}
            >
              {stat.value}
            </motion.p>
            <p className={`text-xs ${stat.textColor}/80 font-medium mt-0.5`}>{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Mini progression chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={13} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Activité récente</span>
            </div>
            <span className="text-xs text-muted-foreground">30 derniers jours</span>
          </div>
          <div className="h-14">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorActivity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// AI Recommendation Card
const AiRecommendation = ({ isVoyageur }: { isVoyageur: boolean }) => {
  const navigate = useNavigate();
  const recommendations = isVoyageur
    ? [
        { text: `Basé sur tes trajets, propose Paris → Dakar pour +45${getCurrencySymbol()}/voyage`, cta: "Voir le trajet", action: () => {} },
        { text: `3 demandes en attente sur ta zone. Active l'acceptation auto pour +20${getCurrencySymbol()}`, cta: "Paramètres", action: () => navigate("/settings") },
      ]
    : [
        { text: `Basé sur tes envois, essaie NeedIt pour une mission d'achat et gagne +20${getCurrencySymbol()}`, cta: "Essayer NeedIt", action: () => navigate("/needit-mission") },
        { text: "Tes envois fréquents vers Casablanca ? Ajoute-le en favori pour un accès rapide", cta: "Ajouter", action: () => {} },
      ];

  const rec = recommendations[Math.floor(Math.random() * recommendations.length)];

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/15 rounded-2xl p-3 animate-in fade-in duration-500">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-accent mb-0.5">Recommandation IA</p>
          <p className="text-xs text-foreground leading-relaxed">{rec.text}</p>
          <button
            onClick={rec.action}
            className="mt-1.5 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            {rec.cta} <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Favorite Routes Section
const FavoriteRoutes = () => {
  const { favorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-3">
      <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-1 uppercase tracking-wider">
        <Star size={12} className="text-accent" /> Favoris
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {favorites.map((fav) => (
          <div key={fav.id}
            className="shrink-0 bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"
          >
            <span className="text-xs font-medium text-foreground">{fav.from} → {fav.to}</span>
            <button onClick={() => removeFavorite(fav.id)} className="text-accent hover:text-destructive transition-colors">
              <Heart size={10} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Transport method icon helper
const getTransportIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case "avion": return "✈️";
    case "train": return "🚄";
    case "voiture": return "🚗";
    case "bus": return "🚌";
    default: return "🚀";
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();
  const { addFavorite, isFavorite } = useFavorites();
  const isVoyageur = roles.includes("voyageur");
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissedBanner, setDismissedBanner] = useState(() => localStorage.getItem("pwa-banner-dismissed") === "1");
  const showInstallBanner = canInstall && !dismissedBanner;

  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState<{ type: "voyage" | "shipment" | "mission"; id: string; label: string } | null>(null);

  // Accept dialog state
  const [acceptDialog, setAcceptDialog] = useState<{ type: "shipment" | "mission"; id: string; label: string } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const actionInProgressRef = useRef(false);

  const handleAcceptItem = async () => {
    if (!acceptDialog || accepting || actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setAccepting(true);
    const { type, id } = acceptDialog;

    try {
      if (type === "shipment") {
        const { data, error } = await supabase.rpc("accept_shipment", { _shipment_id: id });
        if (error) throw error;
        hapticLight();
        toast.success("Colis accepté ! Vous pouvez maintenant discuter.");
        setPendingShipments(prev => prev.filter(s => s.id !== id));
        setAcceptDialog(null);
        navigate(`/chat/${data}`);
      } else {
        const { data, error } = await supabase.rpc("accept_needit_mission", { _mission_id: id });
        if (error) throw error;
        hapticLight();
        toast.success("Mission acceptée ! Vous pouvez maintenant discuter.");
        setNeeditMissions(prev => prev.filter(m => m.id !== id));
        setAcceptDialog(null);
        navigate(`/chat/${data}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'acceptation");
    } finally {
      setAccepting(false);
      actionInProgressRef.current = false;
    }
  };

  const handleCancelItem = async () => {
    if (!cancelDialog) return;
    const { type, id } = cancelDialog;
    let error: any = null;

    if (type === "voyage") {
      const res = await supabase.from("voyages").update({ status: "cancelled" }).eq("id", id);
      error = res.error;
    } else if (type === "shipment") {
      const res = await supabase.from("shipments").update({ status: "cancelled" } as any).eq("id", id);
      error = res.error;
    } else if (type === "mission") {
      const res = await supabase.from("needit_missions").update({ status: "cancelled" }).eq("id", id);
      error = res.error;
    }

    if (error) {
      toast.error("Erreur lors de l'annulation");
    } else {
      toast.success("Annulé avec succès");
    }
    setCancelDialog(null);
  };

  // Demandeur stats
  const [demandeurShipments, setDemandeurShipments] = useState<any[]>([]);
  const [demandeurMissions, setDemandeurMissions] = useState<any[]>([]);

  useEffect(() => {
    if (isVoyageur || !user) return;
    const loadDemandeurData = async () => {
      const [shipRes, missRes] = await Promise.all([
        supabase.from("shipments").select("*").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }),
        supabase.from("needit_missions").select("*").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }),
      ]);
      if (shipRes.data) setDemandeurShipments(shipRes.data);
      if (missRes.data) setDemandeurMissions(missRes.data);
    };
    loadDemandeurData();
    const ch1 = supabase.channel("dem-shipments").on("postgres_changes", { event: "*", schema: "public", table: "shipments", filter: `user_id=eq.${user.id}` }, () => loadDemandeurData()).subscribe();
    const ch2 = supabase.channel("dem-missions").on("postgres_changes", { event: "*", schema: "public", table: "needit_missions", filter: `user_id=eq.${user.id}` }, () => loadDemandeurData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [isVoyageur, user]);

  // Fetch voyages
  useEffect(() => {
    if (!isVoyageur || !user) return;
    const loadVoyages = async () => {
      const { data } = await supabase
        .from("voyages")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("departure_date", { ascending: true });
      if (data) {
        setVoyages(data);
        if (data.length > 0 && !selectedVoyage) setSelectedVoyage(data[0].id);
      }
    };
    loadVoyages();
    const ch = supabase
      .channel("my-voyages")
      .on("postgres_changes", { event: "*", schema: "public", table: "voyages", filter: `user_id=eq.${user.id}` }, () => loadVoyages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isVoyageur, user]);

  // NeedIt missions & pending shipments
  const [needitMissions, setNeeditMissions] = useState<any[]>([]);
  const [pendingShipments, setPendingShipments] = useState<any[]>([]);
  const [colisMatchOnly, setColisMatchOnly] = useState(false);
  const [needitMatchOnly, setNeeditMatchOnly] = useState(false);

  useEffect(() => {
    if (!isVoyageur) return;
    const loadNeedit = async () => {
      const { data } = await supabase.rpc("get_pending_needit_missions");
      if (data) setNeeditMissions(data);
    };
    const loadShipments = async () => {
      const { data } = await supabase.rpc("get_pending_shipments");
      if (data) setPendingShipments(data);
    };
    loadNeedit();
    loadShipments();
    const ch1 = supabase
      .channel("voyageur-needit")
      .on("postgres_changes", { event: "*", schema: "public", table: "needit_missions" }, () => loadNeedit())
      .subscribe();
    const ch2 = supabase
      .channel("voyageur-shipments")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => loadShipments())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [isVoyageur]);

  // Smart matching
  const matchedShipments = useMemo(() => {
    if (!voyages.length || !pendingShipments.length) return [];
    return pendingShipments.filter((s) =>
      voyages.some((v) => {
        const countryMatch = v.arrival_country?.toLowerCase() === s.arrival_country?.toLowerCase();
        const cityMatch = v.arrival_city?.toLowerCase() === s.arrival_city?.toLowerCase();
        return countryMatch && (cityMatch || !s.arrival_city);
      })
    );
  }, [voyages, pendingShipments]);

  const unmatchedShipments = useMemo(() => {
    const matchedIds = new Set(matchedShipments.map((s) => s.id));
    return pendingShipments.filter((s) => !matchedIds.has(s.id));
  }, [pendingShipments, matchedShipments]);

  const matchedNeedit = useMemo(() => {
    if (!voyages.length || !needitMissions.length) return [];
    return needitMissions.filter((m) =>
      voyages.some((v) => {
        const countryMatch = v.arrival_country?.toLowerCase() === m.country?.toLowerCase();
        const cityMatch = v.arrival_city?.toLowerCase() === m.city?.toLowerCase();
        return countryMatch && (cityMatch || !m.city);
      })
    );
  }, [voyages, needitMissions]);

  const unmatchedNeedit = useMemo(() => {
    const matchedIds = new Set(matchedNeedit.map((m) => m.id));
    return needitMissions.filter((m) => !matchedIds.has(m.id));
  }, [needitMissions, matchedNeedit]);

  const totalMatches = matchedShipments.length + matchedNeedit.length;

  // Generate chart data from voyages creation dates (last 30 days)
  const activityChartData = useMemo(() => {
    const now = new Date();
    const days: { name: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const count = voyages.filter(v => v.departure_date && v.departure_date.startsWith(key)).length
        + (isVoyageur ? 0 : demandeurShipments.filter(s => s.created_at?.startsWith(key)).length);
      days.push({ name: label, value: count });
    }
    return days;
  }, [voyages, isVoyageur, demandeurShipments]);

  const toggleRole = async () => {
    if (!user) return;
    const { error } = await supabase.rpc("toggle_user_role", { _user_id: user.id });
    if (error) toast.error("Erreur lors du changement de rôle");
    else window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };


  const currentVoyage = voyages.find((v) => v.id === selectedVoyage);

  const handleToggleFavorite = (from: string, to: string) => {
    if (!isFavorite(from, to)) {
      addFavorite(from, to);
      hapticLight();
      toast.success(`${from} → ${to} ajouté aux favoris`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch { return dateStr; }
  };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    if (isVoyageur) {
      const [vRes, sRes, nRes] = await Promise.all([
        supabase.from("voyages").select("*").eq("user_id", user.id).neq("status", "cancelled").order("departure_date", { ascending: true }),
        supabase.rpc("get_pending_shipments"),
        supabase.rpc("get_pending_needit_missions"),
      ]);
      if (vRes.data) { setVoyages(vRes.data); if (vRes.data.length > 0 && !selectedVoyage) setSelectedVoyage(vRes.data[0].id); }
      if (sRes.data) setPendingShipments(sRes.data);
      if (nRes.data) setNeeditMissions(nRes.data);
    } else {
      const [shipRes, missRes] = await Promise.all([
        supabase.from("shipments").select("*").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }),
        supabase.from("needit_missions").select("*").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }),
      ]);
      if (shipRes.data) setDemandeurShipments(shipRes.data);
      if (missRes.data) setDemandeurMissions(missRes.data);
    }
  }, [user, isVoyageur, selectedVoyage]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
      <PageTransition>
      <main className="px-0 pt-0" id="main-content" role="main" aria-label="Tableau de bord">
        {/* Colorful Hero Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden px-5 pt-12 pb-6"
          style={{
            background: "linear-gradient(135deg, #0066CC, #00A3FF, rgba(52, 199, 89, 0.15))"
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute bottom-0 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute top-12 right-20 w-16 h-16 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center justify-between mb-1">
            <div>
              <h1 className="text-[26px] font-bold text-white leading-tight text-on-gradient">
                {isVoyageur ? "Espace Voyageur" : "Espace Demandeur"}
              </h1>
              <p className="text-sm text-white/70 mt-1 text-on-gradient">
                {isVoyageur ? "Gérez vos trajets et opportunités" : "Envoyez vos colis et missions"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button onClick={toggleRole} aria-label={`Changer vers ${isVoyageur ? "demandeur" : "voyageur"}`}
                className={`w-12 h-7 rounded-full relative transition-colors ${isVoyageur ? "bg-white/30" : "bg-white/20"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${isVoyageur ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <button onClick={handleLogout} className="text-white/70 hover:text-white" aria-label="Se déconnecter">
                <LogOut size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="px-5 pt-2 relative z-10 space-y-4">

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Download size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Installer WeAppYou</p>
                <p className="text-xs text-muted-foreground">Accès rapide & mode hors-ligne</p>
              </div>
              <button onClick={promptInstall} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                Installer
              </button>
              <button onClick={() => { setDismissedBanner(true); localStorage.setItem("pwa-banner-dismissed", "1"); }} className="text-muted-foreground shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isVoyageur ? (
          /* ============ VOYAGEUR ============ */
          <div className="space-y-4">
            {/* Quick Stats */}
            <QuickStats
              voyagesCount={voyages.length}
              colisCount={pendingShipments.length}
              matchCount={totalMatches}
              chartData={activityChartData}
            />

            {/* AI Recommendation */}
            <AiRecommendation isVoyageur={true} />

            {/* Favorite Routes */}
            <FavoriteRoutes />

            <Tabs defaultValue="voyages" className="space-y-3">
              <TabsList className="w-full glass rounded-xl p-1 h-auto">
                <TabsTrigger value="voyages" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Plane size={13} className="mr-1" /> Voyages
                </TabsTrigger>
                <TabsTrigger value="colis" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative transition-all">
                  <Package size={13} className="mr-1" /> Colis
                  {pendingShipments.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pendingShipments.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="carte" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Map size={13} className="mr-1" /> Carte
                </TabsTrigger>
                <TabsTrigger value="demandes" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground relative transition-all">
                  <ShoppingBag size={13} className="mr-1" /> NeedIt
                  {needitMissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {needitMissions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ---- Voyages tab ---- */}
              <TabsContent value="voyages" className="space-y-3 mt-0">
              {voyages.length === 0 ? (
                  <EmptyState
                    icon={Plane}
                    title="Aucun voyage enregistré"
                    description="Commencez par ajouter votre premier trajet pour recevoir des colis"
                    action={
                       <button onClick={() => navigate("/new-trip")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> Ajouter un voyage
                      </button>
                    }
                  />
                ) : (
                  voyages.map((v) => {
                    const isSelected = selectedVoyage === v.id;
                    const fav = isFavorite(v.departure_city, v.arrival_city);
                    return (
                      <button key={v.id} onClick={() => setSelectedVoyage(v.id)}
                        className={`w-full text-left rounded-2xl p-4 relative overflow-hidden transition-all ${
                          isSelected
                            ? "ring-2 ring-primary shadow-lg"
                            : "opacity-85 hover:opacity-100"
                        }`}
                        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                        <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-primary-foreground/8" />

                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{getTransportIcon(v.transport_method)}</span>
                              <h3 className="font-bold text-base text-primary-foreground truncate">
                                {v.departure_city} → {v.arrival_city}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3 text-primary-foreground/80">
                              <span className="flex items-center gap-1 text-xs">
                                <Calendar size={11} />
                                {formatDate(v.departure_date)}
                              </span>
                              {v.departure_time && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Clock size={11} />
                                  {v.departure_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCancelDialog({ type: "voyage", id: v.id, label: `${v.departure_city} → ${v.arrival_city}` }); }}
                              className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                              aria-label="Annuler ce voyage"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(v.departure_city, v.arrival_city); }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                fav ? "bg-accent/30 text-accent" : "bg-primary-foreground/15 text-primary-foreground/60 hover:text-accent"
                              }`}
                            >
                              <Heart size={12} fill={fav ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}

                <button onClick={() => navigate("/new-trip")}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
                  <Plus size={22} /> Ajouter un voyage
                </button>
              </TabsContent>

              {/* ---- Colis tab ---- */}
              <TabsContent value="colis" className="space-y-3 mt-0">
                {/* Match filter toggle */}
                {pendingShipments.length > 0 && matchedShipments.length > 0 && (
                  <button
                    onClick={() => setColisMatchOnly(!colisMatchOnly)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      colisMatchOnly
                        ? "bg-accent text-accent-foreground shadow-md"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Zap size={14} />
                    Correspondances uniquement
                    <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                      colisMatchOnly ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent/15 text-accent"
                    }`}>
                      {matchedShipments.length}
                    </span>
                  </button>
                )}

                {/* Matched shipments */}
                {matchedShipments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> Correspondances ({matchedShipments.length})
                    </h3>
                    {matchedShipments.map((s: any) => (
                      <button key={s.id}
                        onClick={() => setAcceptDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}` })}
                        className="w-full text-left bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5 hover:bg-accent/10 hover:border-accent/40 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                            <p className="font-semibold text-foreground text-sm truncate">
                              {s.departure_city || "—"} → {s.arrival_city}, {s.arrival_country}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.insured && <Shield size={12} className="text-primary" />}
                            <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">{s.size}</span>
                            <ChevronRight size={14} className="text-accent" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {formatDate(s.departure_date)}
                          </span>
                          <span className="font-medium text-foreground">{s.tarif === "custom" ? "Sur devis" : s.tarif}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Other shipments (hidden when filter active) */}
                {!colisMatchOnly && unmatchedShipments.length > 0 && (
                  <div className="space-y-2">
                    {matchedShipments.length > 0 && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                        Autres envois ({unmatchedShipments.length})
                      </h3>
                    )}
                    {unmatchedShipments.map((s: any) => (
                      <div key={s.id} className="bg-card rounded-xl px-3 py-2.5 border border-border">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                             <p className="font-medium text-foreground text-sm truncate">
                               {s.departure_city || "—"} → {s.arrival_city}, {s.arrival_country}
                             </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(s.departure_date)} · Taille {s.size}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.insured && <Shield size={12} className="text-primary" />}
                            <span className="text-xs font-semibold text-foreground">{s.tarif === "custom" ? "Sur devis" : s.tarif}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingShipments.length === 0 && (
                  <EmptyState
                    icon={Package}
                    title="Aucun colis disponible"
                    description="Les envois des demandeurs apparaîtront ici automatiquement"
                  />
                )}
              </TabsContent>

              {/* ---- Carte tab ---- */}
              <TabsContent value="carte" className="space-y-3 mt-0">
                <VoyageMap
                  voyages={voyages}
                  selectedVoyageId={selectedVoyage}
                  onSelectVoyage={setSelectedVoyage}
                  pendingShipments={pendingShipments}
                  pendingMissions={needitMissions}
                />
                {currentVoyage && (
                  <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground text-sm">{currentVoyage.departure_city} → {currentVoyage.arrival_city}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(currentVoyage.departure_date)} {currentVoyage.departure_time ? `à ${currentVoyage.departure_time}` : ""}</p>
                      </div>
                      <span className="text-base">{getTransportIcon(currentVoyage.transport_method)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ---- NeedIt / Demandes tab ---- */}
              <TabsContent value="demandes" className="space-y-3 mt-0">
                {/* Voyage selector chips */}
                {voyages.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {voyages.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVoyage(v.id)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedVoyage === v.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {v.departure_city} → {v.arrival_city}
                      </button>
                    ))}
                  </div>
                )}

                {/* Match filter toggle */}
                {needitMissions.length > 0 && matchedNeedit.length > 0 && (
                  <button
                    onClick={() => setNeeditMatchOnly(!needitMatchOnly)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      needitMatchOnly
                        ? "bg-accent text-accent-foreground shadow-md"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Zap size={14} />
                    Correspondances uniquement
                    <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                      needitMatchOnly ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent/15 text-accent"
                    }`}>
                      {matchedNeedit.length}
                    </span>
                  </button>
                )}

                {/* Matched NeedIt */}
                {matchedNeedit.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> Missions correspondantes ({matchedNeedit.length})
                    </h3>
                    {matchedNeedit.map((m: any) => (
                      <button key={m.id}
                        onClick={() => setAcceptDialog({ type: "mission", id: m.id, label: m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission" })}
                        className="w-full text-left bg-accent/5 border border-accent/20 rounded-xl p-3 hover:bg-accent/10 hover:border-accent/40 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                              <p className="font-semibold text-foreground text-sm truncate">
                                {m.product_name || m.category_path?.[m.category_path?.length - 1] || "Produit"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.prix_max && <p className="text-sm font-bold text-foreground">{m.prix_max} {getCurrencyForCountry(m.country).symbol}</p>}
                            <ChevronRight size={14} className="text-accent" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Other NeedIt (hidden when filter active) */}
                {!needitMatchOnly && unmatchedNeedit.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <ShoppingBag size={12} className="text-muted-foreground" />
                      {matchedNeedit.length > 0 ? `Autres missions (${unmatchedNeedit.length})` : `Missions disponibles (${unmatchedNeedit.length})`}
                    </h3>
                    {unmatchedNeedit.map((m: any) => (
                      <div key={m.id} className="bg-card rounded-xl px-3 py-2.5 border border-border">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {m.product_name || m.category_path?.[m.category_path?.length - 1] || "Produit"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </p>
                          </div>
                          {m.prix_max && <p className="text-sm font-bold text-foreground shrink-0">{m.prix_max} {getCurrencyForCountry(m.country).symbol}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {needitMissions.length === 0 && (
                  <EmptyState
                    icon={ShoppingBag}
                    title="Aucune mission disponible"
                    description="Les missions NeedIt apparaîtront ici"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* ============ DEMANDEUR ============ */
          <div className="space-y-4">
            <div className="space-y-3 mb-4">
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: demandeurShipments.length, label: "Envois", gradient: "from-primary to-primary/70", textColor: "text-primary-foreground" },
                  { value: demandeurMissions.length, label: "Missions", gradient: "from-secondary to-secondary/70", textColor: "text-secondary-foreground" },
                  { value: demandeurShipments.filter(s => s.status === "pending").length, label: "En attente", gradient: "from-accent to-accent/70", textColor: "text-accent-foreground" },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    variants={staggerItem}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-3 text-center cursor-default shadow-lg relative overflow-hidden`}
                  >
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white/10" />
                    <motion.p
                      key={stat.value}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`text-xl font-bold ${stat.textColor}`}
                    >
                      {stat.value}
                    </motion.p>
                    <p className={`text-xs ${stat.textColor}/80 font-medium mt-0.5`}>{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Mini progression chart for demandeur */}
              {activityChartData.some(d => d.value > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card border border-border rounded-2xl p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">Mes envois</span>
                    </div>
                    <span className="text-xs text-muted-foreground">30 derniers jours</span>
                  </div>
                  <div className="h-14">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityChartData}>
                        <defs>
                          <linearGradient id="colorDemandeur" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} labelStyle={{ fontWeight: 600 }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorDemandeur)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI Recommendation */}
            <AiRecommendation isVoyageur={false} />

            {/* Favorite Routes */}
            <FavoriteRoutes />

            <Tabs defaultValue="envois" className="space-y-3">
              <TabsList className="w-full glass rounded-xl p-1 h-auto">
                <TabsTrigger value="envois" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Send size={13} className="mr-1" /> Envois
                </TabsTrigger>
                <TabsTrigger value="missions" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative transition-all">
                  <ShoppingBag size={13} className="mr-1" /> NeedIt
                  {demandeurMissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {demandeurMissions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="carte" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Map size={13} className="mr-1" /> Carte
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Zap size={13} className="mr-1" /> Actions
                </TabsTrigger>
              </TabsList>

              {/* ---- Envois tab ---- */}
              <TabsContent value="envois" className="space-y-3 mt-0">
                {demandeurShipments.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title="Aucun envoi enregistré"
                    description="Commencez par envoyer votre premier colis"
                    action={
                      <button onClick={() => navigate("/send-coly")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> Envoyer un colis
                      </button>
                    }
                  />
                ) : (
                  demandeurShipments.map((s) => (
                    <div key={s.id} className="w-full text-left rounded-2xl p-4 relative overflow-hidden transition-all ring-1 ring-primary/20 hover:ring-2 hover:ring-primary hover:shadow-lg"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                      <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-primary-foreground/8" />
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/tracking/${s.id}`)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">📦</span>
                            <h3 className="font-bold text-base text-primary-foreground truncate">
                              {s.departure_city || "—"} → {s.arrival_city}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-primary-foreground/80">
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar size={11} />
                              {formatDate(s.created_at)}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Package size={11} />
                              Taille {s.size}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {s.status === "pending" && (
                            <button
                              onClick={() => setCancelDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}` })}
                              className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                              aria-label="Annuler cet envoi"
                            >
                              <X size={12} />
                            </button>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            s.status === "pending" ? "bg-primary-foreground/20 text-primary-foreground" :
                            s.status === "accepted" ? "bg-accent/30 text-accent-foreground" :
                            s.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                            "bg-primary-foreground/15 text-primary-foreground/80"
                          }`}>
                            {s.status === "pending" ? "En attente" : s.status === "accepted" ? "Accepté" : s.status === "cancelled" ? "Annulé" : s.status}
                          </span>
                        </div>
                      </div>
                      {s.status === "pending" && (
                        <div className="relative z-10 mt-2">
                          <VoyageurAvailability country={s.arrival_country} city={s.arrival_city} variant="full" />
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button onClick={() => navigate("/send-coly")}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
                  <Plus size={22} /> Envoyer un colis
                </button>
              </TabsContent>

              {/* ---- Missions NeedIt tab ---- */}
              <TabsContent value="missions" className="space-y-3 mt-0">
                {demandeurMissions.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="Aucune mission NeedIt"
                    description="Créez une mission d'achat pour vos besoins"
                    action={
                      <button onClick={() => navigate("/needit-mission")} className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> Créer une mission
                      </button>
                    }
                  />
                ) : (
                  demandeurMissions.map((m) => (
                    <div key={m.id} className="bg-card rounded-xl p-3 border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">🛒</span>
                          <p className="font-semibold text-foreground text-sm truncate">
                            {m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.status === "pending" && (
                            <button
                              onClick={() => navigate(`/needit-mission/${m.id}`)}
                              className="w-6 h-6 rounded-full bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                              aria-label="Modifier cette mission"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => setCancelDialog({ type: "mission", id: m.id, label: m.product_name || "cette mission" })}
                            className="w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                            aria-label="Annuler cette mission"
                          >
                            <X size={11} />
                          </button>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            m.status === "pending" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                          }`}>
                            {m.status === "pending" ? "En attente" : m.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {m.country}{m.city ? `, ${m.city}` : ""}
                        </span>
                        {m.prix_max && <span className="font-medium text-foreground">{m.prix_max}</span>}
                      </div>
                      {m.status === "pending" && (
                        <div className="mt-1.5">
                          <VoyageurAvailability country={m.country} city={m.city} variant="compact" />
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button onClick={() => navigate("/needit-mission")}
                  className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
                  <Plus size={22} /> Créer une mission
                </button>
              </TabsContent>

              {/* ---- Carte tab (demandeur) ---- */}
              <TabsContent value="carte" className="mt-0">
                <PublicMissionsMap />
              </TabsContent>

              {/* ---- Actions tab ---- */}
              <TabsContent value="actions" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/send-coly")}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <Send size={24} className="text-primary-foreground" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Envoyer un colis</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/needit-mission")}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/15 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <ShoppingBag size={24} className="text-secondary-foreground" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Mission NeedIt</span>
                  </motion.button>
                </div>

                <div className="space-y-2 mt-2">
                  {[
                    { label: "Trouver un voyageur", icon: Search, path: "/voyageur-search", color: "primary" },
                    { label: "Mes Missions NeedIt", count: demandeurMissions.length, icon: ShoppingBag, path: "/mes-missions-needit", color: "secondary" },
                    { label: "Historique", icon: Receipt, path: "/history/coly", color: "primary" },
                    { label: "Mon solde", icon: Wallet, path: "/solde", color: "accent" },
                  ].map((link) => (
                    <motion.button
                      key={link.path}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(link.path)}
                      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:shadow-sm transition-shadow"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-${link.color}/10 flex items-center justify-center shrink-0`}>
                        <link.icon size={22} className={`text-${link.color}`} />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1 text-left">{link.label}</span>
                      {"count" in link && typeof link.count === "number" && link.count > 0 && (
                        <span className={`text-xs font-bold text-${link.color} bg-${link.color}/10 px-2 py-0.5 rounded-full`}>{link.count}</span>
                      )}
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </motion.button>
                  ))}
                </div>
              </TabsContent>

              {/* ---- Activité tab ---- */}
              <TabsContent value="activite" className="space-y-3 mt-0">
                {demandeurShipments.length === 0 && demandeurMissions.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Aucune activité"
                    description="Vos envois et missions apparaîtront ici"
                  />
                ) : (
                  <div className="space-y-2">
                    {[...demandeurShipments.slice(0, 3).map(s => ({
                      id: s.id,
                      type: "coly" as const,
                      title: `${s.departure_city || "—"} → ${s.arrival_city}`,
                      subtitle: `Taille ${s.size} · ${s.tarif}`,
                      status: s.status,
                      date: s.created_at,
                    })),
                    ...demandeurMissions.slice(0, 2).map(m => ({
                      id: m.id,
                      type: "needit" as const,
                      title: m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission",
                      subtitle: `${m.country}${m.city ? `, ${m.city}` : ""}`,
                      status: m.status,
                      date: m.created_at,
                    }))]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 4)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => item.type === "coly" ? navigate(`/tracking/${item.id}`) : undefined}
                        className={`flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3 ${item.type === "coly" ? "cursor-pointer hover:shadow-sm" : ""}`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === "coly" ? "bg-primary/10" : "bg-secondary/10"
                        }`}>
                          {item.type === "coly"
                            ? <Send size={16} className="text-primary" />
                            : <ShoppingBag size={16} className="text-secondary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          item.status === "pending" ? "bg-accent/15 text-accent" :
                          item.status === "accepted" ? "bg-primary/15 text-primary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {item.status === "pending" ? "En attente" : item.status === "accepted" ? "Accepté" : item.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        </div>
      </main>
      </PageTransition>
      </PullToRefresh>

      <BottomNav />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={(open) => { if (!open) setCancelDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr d'annuler ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point d'annuler{" "}
              <span className="font-semibold text-foreground">{cancelDialog?.label}</span>.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={!!acceptDialog} onOpenChange={(open) => { if (!open && !accepting) setAcceptDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acceptDialog?.type === "shipment" ? "Accepter ce colis ?" : "Accepter cette mission ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous prendre en charge{" "}
              <span className="font-semibold text-foreground">{acceptDialog?.label}</span> ?
              Une conversation sera créée pour coordonner les détails avec le demandeur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accepting}>Non, passer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptItem}
              disabled={accepting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {accepting ? "Acceptation..." : "Oui, accepter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
