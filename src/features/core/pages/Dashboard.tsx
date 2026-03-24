import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import appLogo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Search, Filter, MapPin, Clock, Plane, Map, Heart, Sparkles, Star, TrendingUp, Package, ShoppingBag, Zap, Calendar, Users, Plus, Send, Receipt, Wallet, ChevronRight, X, Download, BarChart3, Pencil, SlidersHorizontal, Shield, Trash2 } from "lucide-react";
import SortSelect, { applySortOption, type SortOption } from "@/components/SortSelect";
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
import { localizeCity, localizeCountry, localizeRoute } from "@/lib/geoLocalization";
import MatchingSuggestions from "@/features/matching/components/MatchingSuggestions";
import WhatsAppShareButton from "@/components/ShareWhatsAppButton";
import TrustBadgesDisplay from "@/components/TrustBadgesDisplay";
import { useTranslation } from "@/hooks/useTranslation";
import StatisticsTab from "@/features/profile/StatisticsTab";
import WalletCard from "@/components/WalletCard";

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
  max_weight_kg: number | null;
  max_items: number | null;
  cutoff_hours?: number;
};

// --- Voyageur Quick Stats with mini chart ---
const QuickStats = ({ voyagesCount, colisCount, matchCount, chartData, t }: { voyagesCount: number; colisCount: number; matchCount: number; chartData: { name: string; value: number }[]; t: (k: string) => string }) => {
  const stats = [
    { value: voyagesCount, label: t("dashboard.voyages"), gradient: "from-primary to-primary/70", textColor: "text-primary-foreground" },
    { value: colisCount, label: t("dashboard.colisAvail"), gradient: "from-secondary to-secondary/70", textColor: "text-secondary-foreground" },
    { value: matchCount, label: t("dashboard.matches"), gradient: "from-warning to-warning/70", textColor: "text-warning-foreground" },
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

      {/* Activity chart moved to profile page */}
    </div>
  );
};

// AI Recommendation Card
const AiRecommendation = ({ isVoyageur, t }: { isVoyageur: boolean; t: (k: string) => string }) => {
  const navigate = useNavigate();
  const currency = getCurrencySymbol();
  const recommendations = isVoyageur
    ? [
        { text: t("dashboard.aiRecVoyageur1").replace("{currency}", currency), cta: t("dashboard.aiCtaVoyageur1"), action: () => {} },
        { text: t("dashboard.aiRecVoyageur2").replace("{currency}", currency), cta: t("dashboard.aiCtaVoyageur2"), action: () => navigate("/settings") },
      ]
    : [
        { text: t("dashboard.aiRecDemandeur1").replace("{currency}", currency), cta: t("dashboard.aiCtaDemandeur1"), action: () => navigate("/needit-mission") },
        { text: t("dashboard.aiRecDemandeur2"), cta: t("dashboard.aiCtaDemandeur2"), action: () => {} },
      ];

  const rec = recommendations[Math.floor(Math.random() * recommendations.length)];

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/15 rounded-2xl p-3 animate-in fade-in duration-500">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-accent mb-0.5">{t("dashboard.aiRec")}</p>
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
const FavoriteRoutes = ({ t }: { t: (k: string) => string }) => {
  const { routes, removeRoute } = useFavorites();

  if (routes.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-3">
      <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 px-1 uppercase tracking-wider">
        <Star size={12} className="text-accent" /> {t("dashboard.favorites")}
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {routes.map((fav) => (
          <div key={fav.id}
            className="shrink-0 bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"
          >
            <span className="text-xs font-medium text-foreground">{fav.from_city} → {fav.to_city}</span>
            <button onClick={() => removeRoute(fav.id)} className="text-accent hover:text-destructive transition-colors">
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
  const first = method?.split(",")[0]?.trim().toLowerCase();
  switch (first) {
    case "avion": return "✈️";
    case "train": return "🚄";
    case "voiture": return "🚗";
    case "bus": return "🚌";
    case "bateau": return "⛴️";
    case "velo": return "🚲";
    default: return "🚀";
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();
  const { t, language } = useTranslation();
  const { addRoute, isRouteFavorite } = useFavorites();
  const isVoyageur = roles.includes("voyageur");
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissedBanner, setDismissedBanner] = useState(() => localStorage.getItem("pwa-banner-dismissed") === "1");
  const showInstallBanner = canInstall && !dismissedBanner;

  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState<{ type: "voyage" | "shipment" | "mission"; id: string; label: string } | null>(null);

  // Accept dialog state
  const [acceptDialog, setAcceptDialog] = useState<{ type: "shipment" | "mission"; id: string; label: string; isMatched: boolean } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const actionInProgressRef = useRef(false);

  // "Create voyage first" dialog for unmatched items
  const [createVoyageDialog, setCreateVoyageDialog] = useState<{ type: "shipment" | "mission"; id: string; label: string; country: string; city?: string } | null>(null);

  // Size-to-weight mapping for capacity checks (approximate kg)
  const SIZE_WEIGHT_MAP: Record<string, number> = { S: 1, M: 5, L: 10, XL: 20 };

  const checkCapacity = async (type: "shipment" | "mission", itemId: string): Promise<{ ok: boolean; message?: string }> => {
    // Find the matching voyage for this item
    let itemCountry = "";
    let itemCity = "";
    let itemWeight = 0;

    if (type === "shipment") {
      const ship = pendingShipments.find(s => s.id === itemId);
      if (ship) {
        itemCountry = ship.arrival_country;
        itemCity = ship.arrival_city;
        itemWeight = SIZE_WEIGHT_MAP[ship.size] || 5;
      }
    } else {
      const mission = needitMissions.find(m => m.id === itemId);
      if (mission) {
        itemCountry = mission.country;
        itemCity = mission.city;
        itemWeight = mission.poids ? parseFloat(mission.poids) || 1 : 1;
      }
    }

    const matchingVoyage = voyages.find(v => {
      const countryMatch = v.arrival_country?.toLowerCase() === itemCountry?.toLowerCase();
      const cityMatch = v.arrival_city?.toLowerCase() === itemCity?.toLowerCase();
      return countryMatch && (cityMatch || !itemCity);
    });

    if (!matchingVoyage) return { ok: true }; // no voyage to check against
    if (!matchingVoyage.max_weight_kg && !matchingVoyage.max_items) return { ok: true }; // no limits set

    // Count already accepted items on this voyage route
    const [shipRes, missRes] = await Promise.all([
      supabase.from("shipments").select("size").eq("voyageur_id", user!.id).eq("status", "accepted"),
      supabase.from("needit_missions").select("poids").eq("voyageur_id", user!.id).eq("status", "accepted"),
    ]);

    const acceptedShipments = shipRes.data || [];
    const acceptedMissions = missRes.data || [];
    const currentWeight = acceptedShipments.reduce((sum, s) => sum + (SIZE_WEIGHT_MAP[s.size] || 5), 0)
      + acceptedMissions.reduce((sum, m) => sum + (m.poids ? parseFloat(m.poids) || 1 : 1), 0);
    const currentItems = acceptedShipments.length + acceptedMissions.length;

    if (matchingVoyage.max_weight_kg && (currentWeight + itemWeight) > matchingVoyage.max_weight_kg) {
      return { ok: false, message: t("dashboard.capacityExceeded") + ` (${currentWeight + itemWeight}/${matchingVoyage.max_weight_kg} kg)` };
    }
    if (matchingVoyage.max_items && (currentItems + 1) > matchingVoyage.max_items) {
      return { ok: false, message: t("dashboard.capacityExceeded") + ` (${currentItems + 1}/${matchingVoyage.max_items} éléments)` };
    }

    return { ok: true };
  };

  const handleAcceptItem = async () => {
    if (!acceptDialog || accepting || actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setAccepting(true);
    const { type, id } = acceptDialog;

    try {
      // Check capacity before accepting
      const capacityCheck = await checkCapacity(type, id);
      if (!capacityCheck.ok) {
        toast.error(capacityCheck.message || t("dashboard.capacityExceeded"));
        setAccepting(false);
        actionInProgressRef.current = false;
        return;
      }

      if (type === "shipment") {
        const { data, error } = await supabase.rpc("accept_shipment", { _shipment_id: id });
        if (error) throw error;
        hapticLight();
        toast.success(t("dashboard.acceptedShipment"));
        setPendingShipments(prev => prev.filter(s => s.id !== id));
        setAcceptDialog(null);
        navigate(`/chat/${data}`);
      } else {
        const { data, error } = await supabase.rpc("accept_needit_mission", { _mission_id: id });
        if (error) throw error;
        hapticLight();
        toast.success(t("dashboard.acceptedMission"));
        setNeeditMissions(prev => prev.filter(m => m.id !== id));
        setAcceptDialog(null);
        navigate(`/chat/${data}`);
      }
    } catch (err: any) {
      toast.error(err.message || t("dashboard.acceptError"));
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
      toast.error(t("dashboard.cancelError"));
    } else {
      toast.success(t("dashboard.cancelledSuccess"));
    }
    setCancelDialog(null);
  };

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ type: "voyage" | "shipment" | "mission"; id: string; label: string } | null>(null);

  const handleDeleteItem = async () => {
    if (!deleteDialog) return;
    const { type, id } = deleteDialog;
    let error: any = null;

    if (type === "voyage") {
      const res = await supabase.from("voyages").delete().eq("id", id);
      error = res.error;
    } else if (type === "shipment") {
      const res = await supabase.from("shipments").delete().eq("id", id);
      error = res.error;
    } else if (type === "mission") {
      const res = await supabase.from("needit_missions").delete().eq("id", id);
      error = res.error;
    }

    if (error) {
      toast.error(t("dashboard.deleteError"));
    } else {
      toast.success(t("dashboard.deletedSuccess"));
      if (type === "shipment") setDemandeurShipments(prev => prev.filter(s => s.id !== id));
      if (type === "mission") setDemandeurMissions(prev => prev.filter(m => m.id !== id));
      if (type === "voyage") setVoyages(prev => prev.filter(v => v.id !== id));
    }
    setDeleteDialog(null);
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

  // Voyage status filter
  const [voyageStatusFilter, setVoyageStatusFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");

  // Sort state
  const [voyageurColisSort, setVoyageurColisSort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });
  const [voyageurNeeditSort, setVoyageurNeeditSort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });
  const [demandeurEnvoisSort, setDemandeurEnvoisSort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });
  const [demandeurMissionsSort, setDemandeurMissionsSort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });

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
  // Filter voyages that are still open (before cutoff)
  const activeVoyages = useMemo(() => {
    const now = new Date();
    return voyages.filter((v: any) => {
      if (v.status !== "active") return false;
      const depStr = v.departure_date + "T" + (v.departure_time || "00:00");
      const depTime = new Date(depStr).getTime();
      const cutoff = (v.cutoff_hours ?? 24) * 60 * 60 * 1000;
      return depTime - now.getTime() > cutoff;
    });
  }, [voyages]);

  const matchedShipments = useMemo(() => {
    if (!activeVoyages.length || !pendingShipments.length) return [];
    return pendingShipments.filter((s) =>
      activeVoyages.some((v: any) => {
        const countryMatch = v.arrival_country?.toLowerCase() === s.arrival_country?.toLowerCase();
        const cityMatch = v.arrival_city?.toLowerCase() === s.arrival_city?.toLowerCase();
        return countryMatch && (cityMatch || !s.arrival_city);
      })
    );
  }, [activeVoyages, pendingShipments]);

  const unmatchedShipments = useMemo(() => {
    const matchedIds = new Set(matchedShipments.map((s) => s.id));
    return pendingShipments.filter((s) => !matchedIds.has(s.id));
  }, [pendingShipments, matchedShipments]);

  const matchedNeedit = useMemo(() => {
    if (!activeVoyages.length || !needitMissions.length) return [];
    return needitMissions.filter((m) =>
      activeVoyages.some((v: any) => {
        const countryMatch = v.arrival_country?.toLowerCase() === m.country?.toLowerCase();
        const cityMatch = v.arrival_city?.toLowerCase() === m.city?.toLowerCase();
        return countryMatch && (cityMatch || !m.city);
      })
    );
  }, [activeVoyages, needitMissions]);

  const unmatchedNeedit = useMemo(() => {
    const matchedIds = new Set(matchedNeedit.map((m) => m.id));
    return needitMissions.filter((m) => !matchedIds.has(m.id));
  }, [needitMissions, matchedNeedit]);

  const totalMatches = matchedShipments.length + matchedNeedit.length;

  // Sorted lists for voyageur tabs
  const sortedMatchedShipments = useMemo(() => applySortOption(matchedShipments, voyageurColisSort, { dateCreated: "created_at", price: "tarif", departureDate: "departure_date", destination: "arrival_city" }), [matchedShipments, voyageurColisSort]);
  const sortedUnmatchedShipments = useMemo(() => applySortOption(unmatchedShipments, voyageurColisSort, { dateCreated: "created_at", price: "tarif", departureDate: "departure_date", destination: "arrival_city" }), [unmatchedShipments, voyageurColisSort]);
  const sortedMatchedNeedit = useMemo(() => applySortOption(matchedNeedit, voyageurNeeditSort, { dateCreated: "created_at", price: "prix_max", departureDate: "created_at", destination: "country" }), [matchedNeedit, voyageurNeeditSort]);
  const sortedUnmatchedNeedit = useMemo(() => applySortOption(unmatchedNeedit, voyageurNeeditSort, { dateCreated: "created_at", price: "prix_max", departureDate: "created_at", destination: "country" }), [unmatchedNeedit, voyageurNeeditSort]);

  // Sorted lists for demandeur tabs
  const sortedDemandeurShipments = useMemo(() => applySortOption(demandeurShipments, demandeurEnvoisSort, { dateCreated: "created_at", price: "tarif", departureDate: "departure_date", destination: "arrival_city" }), [demandeurShipments, demandeurEnvoisSort]);
  const sortedDemandeurMissions = useMemo(() => applySortOption(demandeurMissions, demandeurMissionsSort, { dateCreated: "created_at", price: "prix_max", departureDate: "created_at", destination: "country" }), [demandeurMissions, demandeurMissionsSort]);

  // Locale for date formatting
  const dateLocale = language === "en" ? "en-US" : language === "es" ? "es-ES" : language === "de" ? "de-DE" : language === "pt" ? "pt-BR" : language === "it" ? "it-IT" : language === "ar" ? "ar-SA" : "fr-FR";

  // Generate chart data from voyages creation dates (last 30 days)
  const activityChartData = useMemo(() => {
    const now = new Date();
    const days: { name: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
      const count = voyages.filter(v => v.departure_date && v.departure_date.startsWith(key)).length
        + (isVoyageur ? 0 : demandeurShipments.filter(s => s.created_at?.startsWith(key)).length);
      days.push({ name: label, value: count });
    }
    return days;
  }, [voyages, isVoyageur, demandeurShipments, dateLocale]);

  const toggleRole = async () => {
    if (!user) return;
    const { error } = await supabase.rpc("toggle_user_role", { _user_id: user.id });
    if (error) toast.error(t("dashboard.roleError"));
    else window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };


  const currentVoyage = voyages.find((v) => v.id === selectedVoyage);

  const handleToggleFavorite = (from: string, to: string) => {
    if (!isRouteFavorite(from, to)) {
      addRoute(from, to);
      hapticLight();
      toast.success(`${from} → ${to} ${t("dashboard.addedToFav")}`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
    } catch { return dateStr; }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return t("dashboard.statusPending");
      case "accepted": return t("dashboard.statusAccepted");
      case "cancelled": return t("dashboard.statusCancelled");
      case "completed": return "Terminé";
      case "delivered": return "Livré";
      case "picked_up": return "Récupéré";
      case "in_transit": return "En transit";
      default: return status;
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    if (isVoyageur) {
      const [vRes, sRes, nRes] = await Promise.all([
        supabase.from("voyages").select("*").eq("user_id", user.id).order("departure_date", { ascending: true }),
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
      <main className="px-0 pt-0" id="main-content" role="main">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >

          <div className="bg-[#F8FAFC] dark:bg-[#0F1115] px-5 pt-5 pb-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <img src={appLogo} alt="Nidit" className="w-10 h-10 object-contain" />
                <NotificationBell />
              </div>
              <button
                onClick={toggleRole}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.97]"
                style={{ background: isVoyageur ? "#30D158" : "#0D84FF" }}
              >
                {isVoyageur ? t("dashboard.switchToDemandeur") : t("dashboard.switchToVoyageur")}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {isVoyageur ? (
                <Plane size={38} style={{ color: "#0D84FF" }} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Package size={38} style={{ color: "#30D158" }} strokeWidth={1.8} aria-hidden="true" />
              )}
              <div>
                <h1 className="text-[28px] font-bold leading-tight" style={{ color: isVoyageur ? "#0D84FF" : "#30D158" }}>
                  {isVoyageur ? t("dashboard.roleVoyageur") : t("dashboard.roleDemandeur")}
                </h1>
                <p className="text-[15px] mt-0.5" style={{ color: "#64748B" }}>
                  {isVoyageur ? t("dashboard.voyageurSubtitle") : t("dashboard.demandeurSubtitle")}
                </p>
              </div>
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
                <p className="text-sm font-semibold text-foreground">{t("dashboard.installWeAppYou")}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.installQuick")}</p>
              </div>
              <button onClick={promptInstall} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                {t("dashboard.installBtn")}
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
            <QuickStats
              voyagesCount={voyages.length}
              colisCount={pendingShipments.length}
              matchCount={totalMatches}
              chartData={activityChartData}
              t={t}
            />

            <WalletCard compact />

            <FavoriteRoutes t={t} />

            <Tabs defaultValue="voyages" className="space-y-3">
              <TabsList className="w-full glass rounded-xl p-1 h-auto">
                <TabsTrigger value="voyages" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Plane size={13} className="mr-1" /> {t("dashboard.tabVoyages")}
                </TabsTrigger>
                <TabsTrigger value="colis" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative transition-all">
                  <Package size={13} className="mr-1" /> {t("dashboard.tabColis")}
                  {pendingShipments.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pendingShipments.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="carte" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Map size={13} className="mr-1" /> {t("dashboard.tabCarte")}
                </TabsTrigger>
                <TabsTrigger value="demandes" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground relative transition-all">
                  <ShoppingBag size={13} className="mr-1" /> {t("dashboard.tabNeedit")}
                  {needitMissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {needitMissions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <BarChart3 size={13} className="mr-1" /> Stats
                </TabsTrigger>
              </TabsList>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/new-trip")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> {t("dashboard.addTrip")}
                </button>
                <button
                  onClick={() => navigate("/transporter")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors"
                >
                  <Calendar size={14} /> Mes disponibilités
                </button>
              </div>

              {/* ---- Voyages tab ---- */}
              <TabsContent value="voyages" className="space-y-3 mt-0">
                {/* Status filter */}
                {voyages.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {([
                      { key: "all" as const, label: `Tous (${voyages.length})` },
                      { key: "active" as const, label: `Actifs (${voyages.filter(v => v.status === "active").length})` },
                      { key: "completed" as const, label: `Terminés (${voyages.filter(v => v.status === "completed").length})` },
                      { key: "cancelled" as const, label: `Annulés (${voyages.filter(v => v.status === "cancelled").length})` },
                    ]).map(f => (
                      <button
                        key={f.key}
                        onClick={() => setVoyageStatusFilter(f.key)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          voyageStatusFilter === f.key
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              {voyages.length === 0 ? (
                  <EmptyState
                    icon={Plane}
                    title={t("dashboard.noVoyageRegistered")}
                    description={t("dashboard.noVoyageRegisteredDesc")}
                    action={
                       <button onClick={() => navigate("/new-trip")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> {t("dashboard.addTrip")}
                      </button>
                    }
                  />
                ) : (
                  voyages.filter(v => voyageStatusFilter === "all" || v.status === voyageStatusFilter).length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Aucun voyage avec ce statut</p>
                  ) : voyages.filter(v => voyageStatusFilter === "all" || v.status === voyageStatusFilter).map((v) => {
                    const isSelected = selectedVoyage === v.id;
                    const fav = isRouteFavorite(v.departure_city, v.arrival_city);
                    return (
                      <button key={v.id} onClick={() => navigate(`/voyage/${v.id}`)}
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
                                {localizeCity(v.departure_city)} → {localizeCity(v.arrival_city)}
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
                              {(() => {
                                const depTime = new Date(v.departure_date + "T" + (v.departure_time || "00:00")).getTime();
                                const cutoffMs = (v.cutoff_hours ?? 24) * 60 * 60 * 1000;
                                const remaining = depTime - Date.now();
                                // Show badge if remaining time is less than 2x cutoff (close to closing)
                                if (v.status === "active" && remaining > 0 && remaining < cutoffMs * 2) {
                                  return (
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-warning/90 text-warning-foreground px-1.5 py-0.5 rounded-full">
                                      <Clock size={9} />
                                      Bientôt fermé
                                    </span>
                                  );
                                }
                                if (v.status === "completed") {
                                  return (
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-green-500/90 text-white px-1.5 py-0.5 rounded-full">
                                      ✅ Terminé
                                    </span>
                                  );
                                }
                                if (v.status === "cancelled") {
                                  return (
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded-full">
                                      Annulé
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {v.status === "cancelled" ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteDialog({ type: "voyage", id: v.id, label: `${v.departure_city} → ${v.arrival_city}` }); }}
                                className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setCancelDialog({ type: "voyage", id: v.id, label: `${v.departure_city} → ${v.arrival_city}` }); }}
                                className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
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

              </TabsContent>

              {/* ---- Colis tab ---- */}
              <TabsContent value="colis" className="space-y-3 mt-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                      {t("dashboard.matchOnlyLabel")}
                      <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                        colisMatchOnly ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent/15 text-accent"
                      }`}>
                        {matchedShipments.length}
                      </span>
                    </button>
                  )}
                  {pendingShipments.length > 0 && (
                    <SortSelect value={voyageurColisSort} onChange={setVoyageurColisSort} t={t} />
                  )}
                </div>

                {matchedShipments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> {t("dashboard.matches_label")} ({matchedShipments.length})
                    </h3>
                    {sortedMatchedShipments.map((s: any) => (
                      <button key={s.id}
                        onClick={() => setAcceptDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}`, isMatched: true })}
                        className="w-full text-left bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5 hover:bg-accent/10 hover:border-accent/40 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                            <p className="font-semibold text-foreground text-sm truncate">
                              {s.departure_city ? localizeCity(s.departure_city) : "—"} → {localizeCity(s.arrival_city)}, {localizeCountry(s.arrival_country)}
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
                          <span className="font-medium text-foreground">{s.tarif === "custom" ? t("dashboard.onQuote") : s.tarif}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!colisMatchOnly && unmatchedShipments.length > 0 && (
                  <div className="space-y-2">
                    {matchedShipments.length > 0 && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                        {t("dashboard.otherShipments")} ({unmatchedShipments.length})
                      </h3>
                    )}
                    {sortedUnmatchedShipments.map((s: any) => (
                      <button key={s.id}
                        onClick={() => setCreateVoyageDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}`, country: s.arrival_country, city: s.arrival_city })}
                        className="w-full text-left bg-card rounded-xl px-3 py-2.5 border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                             <p className="font-medium text-foreground text-sm truncate">
                               {s.departure_city ? localizeCity(s.departure_city) : "—"} → {localizeCity(s.arrival_city)}, {localizeCountry(s.arrival_country)}
                              </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(s.departure_date)} · {t("dashboard.size")} {s.size}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.insured && <Shield size={12} className="text-primary" />}
                            <span className="text-xs font-semibold text-foreground">{s.tarif === "custom" ? t("dashboard.onQuote") : s.tarif}</span>
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {pendingShipments.length === 0 && (
                  <EmptyState
                    icon={Package}
                    title={t("dashboard.noColisAvailable")}
                    description={t("dashboard.noColisAvailableDesc")}
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
                        <p className="font-bold text-foreground text-sm">{localizeCity(currentVoyage.departure_city)} → {localizeCity(currentVoyage.arrival_city)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(currentVoyage.departure_date)} {currentVoyage.departure_time ? `${currentVoyage.departure_time}` : ""}</p>
                      </div>
                      <span className="text-base">{getTransportIcon(currentVoyage.transport_method)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ---- NeedIt / Demandes tab ---- */}
              <TabsContent value="demandes" className="space-y-3 mt-0">
                {voyages.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {voyages.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVoyage(v.id)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedVoyage === v.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {localizeCity(v.departure_city)} → {localizeCity(v.arrival_city)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
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
                      {t("dashboard.matchOnlyLabel")}
                      <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                        needitMatchOnly ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent/15 text-accent"
                      }`}>
                        {matchedNeedit.length}
                      </span>
                    </button>
                  )}
                  {needitMissions.length > 0 && (
                    <SortSelect value={voyageurNeeditSort} onChange={setVoyageurNeeditSort} t={t} keys={["dateCreated", "price", "destination"]} />
                  )}
                </div>

                {matchedNeedit.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> {t("dashboard.matchingMissions")} ({matchedNeedit.length})
                    </h3>
                    {sortedMatchedNeedit.map((m: any) => (
                      <button key={m.id}
                        onClick={() => setAcceptDialog({ type: "mission", id: m.id, label: m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission", isMatched: true })}
                        className="w-full text-left bg-accent/5 border border-accent/20 rounded-xl p-3 hover:bg-accent/10 hover:border-accent/40 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                              <p className="font-semibold text-foreground text-sm truncate">
                                {m.product_name || m.category_path?.[m.category_path?.length - 1] || "—"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {localizeCountry(m.country)}{m.city ? `, ${localizeCity(m.city)}` : ""}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {m.prix_max && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#30D158", background: "rgba(48,209,88,0.1)" }}>{t("needit.budgetMax")}: {m.prix_max} {getCurrencyForCountry(m.country).symbol}</span>}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.auto_accept ? "text-[#0D84FF] bg-[#0D84FF]/10" : "text-muted-foreground bg-muted"}`}>{t("needit.autoAccept")}: {m.auto_accept ? t("needit.autoAcceptYes") : t("needit.autoAcceptNo")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ChevronRight size={14} className="text-accent" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!needitMatchOnly && unmatchedNeedit.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <ShoppingBag size={12} className="text-muted-foreground" />
                      {matchedNeedit.length > 0 ? `${t("dashboard.otherMissions")} (${unmatchedNeedit.length})` : `${t("dashboard.availableMissions")} (${unmatchedNeedit.length})`}
                    </h3>
                    {sortedUnmatchedNeedit.map((m: any) => (
                      <button key={m.id}
                        onClick={() => setCreateVoyageDialog({ type: "mission", id: m.id, label: m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission", country: m.country, city: m.city })}
                        className="w-full text-left bg-card rounded-xl px-3 py-2.5 border border-border hover:border-secondary/40 hover:bg-secondary/5 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {m.product_name || m.category_path?.[m.category_path?.length - 1] || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {localizeCountry(m.country)}{m.city ? `, ${localizeCity(m.city)}` : ""}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {m.prix_max && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#30D158", background: "rgba(48,209,88,0.1)" }}>{t("needit.budgetMax")}: {m.prix_max} {getCurrencyForCountry(m.country).symbol}</span>}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.auto_accept ? "text-[#0D84FF] bg-[#0D84FF]/10" : "text-muted-foreground bg-muted"}`}>{t("needit.autoAccept")}: {m.auto_accept ? t("needit.autoAcceptYes") : t("needit.autoAcceptNo")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.prix_max && <p className="text-sm font-bold text-foreground">{m.prix_max} {getCurrencyForCountry(m.country).symbol}</p>}
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {needitMissions.length === 0 && (
                  <EmptyState
                    icon={ShoppingBag}
                    title={t("dashboard.noMissionAvailable")}
                    description={t("dashboard.noMissionAvailableDesc")}
                  />
                )}
              </TabsContent>

              {/* ---- Stats tab ---- */}
              <TabsContent value="stats" className="space-y-3 mt-0">
                <StatisticsTab compact />
                <button
                  onClick={() => navigate("/history/voyageur")}
                  className="w-full py-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <BarChart3 size={14} /> Voir l'historique complet
                </button>
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
                  { value: demandeurShipments.length, label: t("dashboard.tabEnvois"), gradient: "from-primary to-primary/70", textColor: "text-primary-foreground" },
                  { value: demandeurMissions.length, label: "Missions", gradient: "from-secondary to-secondary/70", textColor: "text-secondary-foreground" },
                  { value: demandeurShipments.filter(s => s.status === "pending").length, label: t("dashboard.statusPending"), gradient: "from-warning to-warning/70", textColor: "text-warning-foreground" },
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

              {/* Activity chart moved to profile page */}
            </div>

            <WalletCard compact />

            <FavoriteRoutes t={t} />

            <Tabs defaultValue="envois" className="space-y-3">
              <TabsList className="w-full glass rounded-xl p-1 h-auto">
                <TabsTrigger value="envois" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Send size={13} className="mr-1" /> {t("dashboard.tabEnvois")}
                </TabsTrigger>
                <TabsTrigger value="missions" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative transition-all">
                  <ShoppingBag size={13} className="mr-1" /> {t("dashboard.tabNeedit")}
                  {demandeurMissions.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {demandeurMissions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="carte" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Map size={13} className="mr-1" /> {t("dashboard.tabCarte")}
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <Zap size={13} className="mr-1" /> {t("dashboard.tabActions")}
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  <BarChart3 size={13} className="mr-1" /> Stats
                </TabsTrigger>
              </TabsList>

              {/* ---- Envois tab ---- */}
              <TabsContent value="envois" className="space-y-3 mt-0">
                {demandeurShipments.length > 0 && (
                  <SortSelect value={demandeurEnvoisSort} onChange={setDemandeurEnvoisSort} t={t} />
                )}
                {demandeurShipments.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title={t("dashboard.noShipmentRegistered")}
                    description={t("dashboard.noShipmentRegisteredDesc")}
                    action={
                      <button onClick={() => navigate("/send-coly")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> {t("dashboard.sendParcel")}
                      </button>
                    }
                  />
                ) : (
                  sortedDemandeurShipments.map((s) => (
                    <div key={s.id} className="w-full text-left rounded-2xl p-4 relative overflow-hidden transition-all ring-1 ring-primary/20 hover:ring-2 hover:ring-primary hover:shadow-lg"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                      <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-primary-foreground/8" />
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/shipment/${s.id}`)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">📦</span>
                            <h3 className="font-bold text-base text-primary-foreground truncate">
                              {s.departure_city ? localizeCity(s.departure_city) : "—"} → {localizeCity(s.arrival_city)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-primary-foreground/80">
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar size={11} />
                              {formatDate(s.created_at)}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Package size={11} />
                              {t("dashboard.size")} {s.size}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {s.status === "pending" && (
                            <button
                              onClick={() => setCancelDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}` })}
                              className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                          {(s.status === "cancelled" || s.status === "delivered" || s.status === "completed") && (
                            <button
                              onClick={() => setDeleteDialog({ type: "shipment", id: s.id, label: `${s.departure_city || "—"} → ${s.arrival_city}` })}
                              className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground/60 hover:bg-destructive/80 hover:text-destructive-foreground flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            s.status === "pending" ? "bg-primary-foreground/20 text-primary-foreground" :
                            s.status === "accepted" ? "bg-accent/30 text-accent-foreground" :
                            s.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                            "bg-primary-foreground/15 text-primary-foreground/80"
                          }`}>
                            {getStatusLabel(s.status)}
                          </span>
                        </div>
                      </div>
                      {s.status === "pending" && (
                        <div className="relative z-10 mt-2 space-y-2">
                          <VoyageurAvailability country={s.arrival_country} city={s.arrival_city} variant="full" />
                          <MatchingSuggestions
                            destinationCountry={s.arrival_country}
                            destinationCity={s.arrival_city}
                            departureDate={s.departure_date}
                            estimatedWeightKg={
                              s.size === "S" ? 1 : s.size === "M" ? 3 : s.size === "L" ? 5 : s.size === "XL" ? 7 : s.size === "XXL" ? 10 : undefined
                            }
                            compact
                          />
                          <WhatsAppShareButton
                            type="shipment"
                            id={s.id}
                            title={`Colis ${s.size}`}
                            from={s.departure_city}
                            destination={`${s.arrival_city}, ${s.arrival_country}`}
                            price={s.tarif}
                            variant="full"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button onClick={() => navigate("/send-coly")}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
                  <Plus size={22} /> {t("dashboard.sendParcel")}
                </button>
              </TabsContent>

              {/* ---- Missions NeedIt tab ---- */}
              <TabsContent value="missions" className="space-y-3 mt-0">
                {demandeurMissions.length > 0 && (
                  <SortSelect value={demandeurMissionsSort} onChange={setDemandeurMissionsSort} t={t} keys={["dateCreated", "price", "destination"]} />
                )}
                {demandeurMissions.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title={t("dashboard.noNeeditMission")}
                    description={t("dashboard.noNeeditMissionDesc")}
                    action={
                      <button onClick={() => navigate("/needit-mission")} className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                        <Plus size={20} className="inline mr-1.5 -mt-0.5" /> {t("dashboard.createMission")}
                      </button>
                    }
                  />
                ) : (
                  sortedDemandeurMissions.map((m) => (
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
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          {(m.status === "pending" || m.status === "accepted") && (
                            <button
                              onClick={() => setCancelDialog({ type: "mission", id: m.id, label: m.product_name || "—" })}
                              className="w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                            >
                              <X size={11} />
                            </button>
                          )}
                          {(m.status === "cancelled" || m.status === "completed") && (
                            <button
                              onClick={() => setDeleteDialog({ type: "mission", id: m.id, label: m.product_name || "—" })}
                              className="w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            m.status === "pending" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                          }`}>
                            {getStatusLabel(m.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {localizeCountry(m.country)}{m.city ? `, ${localizeCity(m.city)}` : ""}
                        </span>
                        {m.prix_max && <span className="font-medium text-foreground">{m.prix_max}</span>}
                      </div>
                      {m.status === "pending" && (
                        <div className="mt-1.5 space-y-2">
                          <VoyageurAvailability country={m.country} city={m.city} variant="compact" />
                          <WhatsAppShareButton
                            type="needit"
                            id={m.id}
                            title={m.product_name || "Mission NeedIt"}
                            destination={`${m.country}${m.city ? `, ${m.city}` : ""}`}
                            price={m.prix_max}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button onClick={() => navigate("/needit-mission")}
                  className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
                  <Plus size={22} /> {t("dashboard.createMission")}
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
                    <span className="text-sm font-bold text-foreground">{t("dashboard.sendParcel")}</span>
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
                    <span className="text-sm font-bold text-foreground">{t("dashboard.missionNeedit")}</span>
                  </motion.button>
                </div>

                <div className="space-y-2 mt-2">
                  {[
                    { label: t("dashboard.findTraveler"), icon: Search, path: "/voyageur-search", color: "primary" },
                    { label: t("dashboard.myNeeditMissions"), count: demandeurMissions.length, icon: ShoppingBag, path: "/mes-missions-needit", color: "secondary" },
                    { label: t("dashboard.history"), icon: Receipt, path: "/history/coly", color: "primary" },
                    { label: t("dashboard.myBalance"), icon: Wallet, path: "/solde", color: "accent" },
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
                    title={t("dashboard.noActivity")}
                    description={t("dashboard.noActivityDesc")}
                  />
                ) : (
                  <div className="space-y-2">
                    {[...demandeurShipments.slice(0, 3).map(s => ({
                      id: s.id,
                      type: "coly" as const,
                      title: `${s.departure_city ? localizeCity(s.departure_city) : "—"} → ${localizeCity(s.arrival_city)}`,
                      subtitle: `${t("dashboard.size")} ${s.size} · ${s.tarif}`,
                      status: s.status,
                      date: s.created_at,
                    })),
                    ...demandeurMissions.slice(0, 2).map(m => ({
                      id: m.id,
                      type: "needit" as const,
                      title: m.product_name || m.category_path?.[m.category_path?.length - 1] || "Mission",
                      subtitle: `${localizeCountry(m.country)}${m.city ? `, ${localizeCity(m.city)}` : ""}`,
                      status: m.status,
                      date: m.created_at,
                    }))]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 4)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => item.type === "coly" ? navigate(`/tracking/${item.id}`) : navigate(`/mission/${item.id}`)}
                        className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3 cursor-pointer hover:shadow-sm"
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
                        <div className="flex items-center gap-2 shrink-0">
                          {(item.status === "accepted" || item.status === "picked_up" || item.status === "in_transit") && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/live-tracking/${item.id}`); }}
                              className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-1 hover:bg-green-500/20 transition-colors"
                            >
                              <MapPin size={10} />
                              Live
                            </button>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            item.status === "pending" ? "bg-accent/15 text-accent" :
                            item.status === "accepted" ? "bg-primary/15 text-primary" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ---- Stats tab ---- */}
              <TabsContent value="stats" className="space-y-3 mt-0">
                <StatisticsTab compact />
                <button
                  onClick={() => navigate("/history/coly")}
                  className="w-full py-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <BarChart3 size={14} /> Voir l'historique complet
                </button>
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
            <AlertDialogTitle>{t("dashboard.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.cancelDesc")}{" "}
              <span className="font-semibold text-foreground">{cancelDialog?.label}</span>.
              {" "}{t("dashboard.cancelIrreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.cancelNo")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dashboard.cancelYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteDesc")}{" "}
              <span className="font-semibold text-foreground">{deleteDialog?.label}</span>.
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

      <AlertDialog open={!!acceptDialog} onOpenChange={(open) => { if (!open && !accepting) setAcceptDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acceptDialog?.type === "shipment" ? t("dashboard.acceptShipmentTitle") : t("dashboard.acceptMissionTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.acceptDesc")}{" "}
              <span className="font-semibold text-foreground">{acceptDialog?.label}</span> ?
              {" "}{t("dashboard.acceptConvoDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accepting}>{t("dashboard.acceptNo")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptItem}
              disabled={accepting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {accepting ? t("dashboard.accepting") : t("dashboard.acceptYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Voyage First Dialog (for unmatched items) */}
      <AlertDialog open={!!createVoyageDialog} onOpenChange={(open) => { if (!open) setCreateVoyageDialog(null); }}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Plane size={20} className="inline mr-2 text-primary" />
              {t("dashboard.createVoyageFirstTitle") || "Créer un voyage d'abord"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.createVoyageFirstDesc") || "Pour accepter"}{" "}
              <span className="font-semibold text-foreground">{createVoyageDialog?.label}</span>
              {", "}
              {t("dashboard.createVoyageFirstDesc2") || "vous devez d'abord enregistrer un voyage vers cette destination. Cela permet de vérifier votre capacité d'emport et votre budget."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.cancelNo")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const params = new URLSearchParams();
                if (createVoyageDialog?.country) params.set("arrival_country", createVoyageDialog.country);
                if (createVoyageDialog?.city) params.set("arrival_city", createVoyageDialog.city);
                navigate(`/new-trip?${params.toString()}`);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plane size={16} className="mr-1.5" />
              {t("dashboard.createVoyageBtn") || "Créer un voyage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
