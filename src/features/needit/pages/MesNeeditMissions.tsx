import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SortSelect, { applySortOption, type SortOption } from "@/components/SortSelect";
import { ArrowLeft, Plus, MapPin, Clock, Package, Loader2, ScanBarcode, CheckCircle2, Pencil, Users, Trash2, Share2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EanScanner from "@/components/EanScanner";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import VoyageurAvailability from "@/components/VoyageurAvailability";
import PullToRefresh from "@/components/PullToRefresh";
import NotificationBell from "@/components/NotificationBell";
import CategoryIcon from "@/components/CategoryIcon";
import needitBagIllustration from "@/assets/illustrations/needit-bag.png";
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

interface NeeditMission {
  id: string;
  country: string;
  city: string | null;
  timing: string;
  category_path: string[];
  product_name: string | null;
  is_unlisted: boolean;
  photo_url: string | null;
  dimension: string | null;
  poids: string | null;
  prix_max: string | null;
  status: string;
  created_at: string;
  ean_code: string | null;
  ean_verified: boolean;
  voyageur_id: string | null;
  user_id: string;
}

const statusLabels: Record<string, { label: string; bgClass: string; textColor: string }> = {
  pending: { label: "En attente", bgClass: "bg-gradient-to-r from-primary to-secondary", textColor: "text-primary-foreground" },
  accepted: { label: "Acceptée", bgClass: "bg-gradient-to-r from-emerald-500 to-teal-500", textColor: "text-white" },
  completed: { label: "Terminée", bgClass: "bg-gradient-to-r from-slate-500 to-slate-600", textColor: "text-white" },
  cancelled: { label: "Annulée", bgClass: "bg-gradient-to-r from-rose-500 to-red-500", textColor: "text-white" },
};

const getFilterTabs = (t: (k: string) => string) => [
  { key: "all" as const, label: t("missions.all") },
  { key: "pending" as const, label: t("missions.pending") },
  { key: "accepted" as const, label: t("missions.inProgress") },
  { key: "completed" as const, label: t("missions.completed") },
];

type FilterKey = "all" | "pending" | "accepted" | "completed";

const MesNeeditMissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [missions, setMissions] = useState<NeeditMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningMissionId, setScanningMissionId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortOption>({ key: "dateCreated", dir: "desc" });
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleDelete = async () => {
    if (!deleteId) return;
    // Find the mission to check its status
    const mission = missions.find(m => m.id === deleteId);
    if (mission && (mission.status === "picked_up" || mission.status === "in_transit")) {
      toast.error("L'objet a déjà été récupéré. Ouvrez un litige en cas de problème.");
      setDeleteId(null);
      return;
    }
    const { error } = await supabase.from("needit_missions").update({ status: "cancelled" }).eq("id", deleteId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Mission supprimée");
      loadMissions();
    }
    setDeleteId(null);
    setSwipedId(null);
  };

  const handleShare = useCallback(async (m: NeeditMission) => {
    const text = `Mission NeedIt : ${m.product_name || "Produit"} — ${m.country}${m.city ? `, ${m.city}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mission NeedIt", text, url: window.location.origin });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Lien copié !");
    }
  }, []);

  const loadMissions = async () => {
    if (!user) return;
    const { data: ownedData } = await supabase
      .from("needit_missions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: acceptedData } = await supabase
      .from("needit_missions")
      .select("*")
      .eq("voyageur_id", user.id)
      .order("created_at", { ascending: false });

    const allMissions = [...(ownedData || []), ...(acceptedData || [])];
    const unique = Array.from(new Map(allMissions.map(m => [m.id, m])).values());
    setMissions(unique as unknown as NeeditMission[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadMissions();

    const channel = supabase
      .channel("my-needit-missions")
      .on("postgres_changes", { event: "*", schema: "public", table: "needit_missions", filter: `user_id=eq.${user.id}` }, () => {
        loadMissions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "needit_missions", filter: `voyageur_id=eq.${user.id}` }, () => {
        loadMissions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const counts = {
    all: missions.filter(m => m.status !== "cancelled").length,
    pending: missions.filter(m => m.status === "pending").length,
    accepted: missions.filter(m => m.status === "accepted").length,
    completed: missions.filter(m => m.status === "completed").length,
  };

  const filteredMissions = useMemo(() => {
    let result = activeFilter === "all"
      ? missions.filter(m => m.status !== "cancelled")
      : missions.filter(m => m.status === activeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.product_name || "").toLowerCase().includes(q) ||
        (m.country || "").toLowerCase().includes(q) ||
        (m.city || "").toLowerCase().includes(q) ||
        (m.category_path || []).join(" ").toLowerCase().includes(q) ||
        new Date(m.created_at).toLocaleDateString("fr-FR").includes(q)
      );
    }
    return result;
  }, [missions, activeFilter, search]);

  const sortedMissions = useMemo(
    () => applySortOption(filteredMissions, sort, { dateCreated: "created_at", price: "prix_max", departureDate: "created_at", destination: "country" }),
    [filteredMissions, sort]
  );

  return (
    <div className="page-shell">
      <PageTransition>
        <PullToRefresh onRefresh={loadMissions}>
          {/* ─── Header Future ─── */}
          <header className="page-header-soft">
            <div className="page-content">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="icon-btn-soft"
                  aria-label="Retour"
                >
                  <ArrowLeft size={18} className="text-foreground" />
                </button>
                <NotificationBell />
              </div>
              <span className="greeting-bubble-xl mb-3">
                <Package size={18} className="text-primary" />
                NeedIt
              </span>
              <h1 className="text-[clamp(1.85rem,5.5vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
                {t("missions.title")}<br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  livré par un voyageur ✨
                </span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground font-medium max-w-[280px]">
                {t("missions.subtitle")}
              </p>

              {/* ─── Tabs segment control ─── */}
              <div className="mt-6 flex gap-1.5 bg-card/70 backdrop-blur-md border border-border/50 rounded-2xl p-1 shadow-soft">
                {getFilterTabs(t).map((tab) => {
                  const count = counts[tab.key];
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive ? "bg-white/25 text-primary-foreground" : "bg-primary/15 text-primary"
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="page-content pt-6">
            {/* Search bar Future */}
            <label className="search-pill mb-4">
              <Search size={18} className="text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Rechercher par produit ou date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            {/* Sort + New mission */}
            {missions.length > 0 && (
              <div className="mb-3">
                <SortSelect value={sort} onChange={setSort} t={t} keys={["dateCreated", "price", "destination"]} />
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/needit-mission")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[17px] text-primary-foreground shadow-elevated mt-3 mb-6 transition-opacity hover:opacity-95 bg-gradient-to-r from-primary via-primary to-secondary"
            >
              <Plus size={22} /> {t("missions.new")}
            </motion.button>

            {/* ─── Missions list ─── */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin" style={{ color: "#0D84FF" }} />
              </div>
            ) : missions.length === 0 ? (
              <div className="py-6 px-2">
                <EmptyState
                  icon={Package}
                  title={t("missions.empty")}
                  description={t("missions.emptyDesc")}
                  illustration={needitBagIllustration}
                  action={
                    <button
                      onClick={() => navigate("/needit/categories")}
                      className="px-6 py-3.5 rounded-2xl text-primary-foreground text-sm font-bold bg-gradient-primary shadow-elevated hover:shadow-glow active:scale-[0.97] transition-all"
                    >
                      <Plus size={20} className="inline mr-1.5 -mt-0.5" /> {t("missions.createFirst")}
                    </button>
                  }
                />

                {/* How it works guide */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#2A3245] shadow-sm"
                >
                  <div className="bg-[#0D84FF]/10 dark:bg-[#0D84FF]/5 px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0D84FF]/15 flex items-center justify-center">
                      <Package size={20} style={{ color: "#0D84FF" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">{t("missions.howItWorks")}</p>
                      <p className="text-xs" style={{ color: "#64748B" }}>{t("missions.howItWorksDesc")}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1A1F2E] px-5 py-4">
                    <div className="relative">
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-[#E2E8F0] dark:bg-[#2A3245]" />
                      <div className="space-y-5">
                        {[
                          { step: 1, icon: MapPin, title: t("missions.step1"), desc: t("missions.step1Desc") },
                          { step: 2, icon: Package, title: t("missions.step2"), desc: t("missions.step2Desc") },
                          { step: 3, icon: ScanBarcode, title: t("missions.step3"), desc: t("missions.step3Desc") },
                          { step: 4, icon: CheckCircle2, title: t("missions.step4"), desc: t("missions.step4Desc") },
                        ].map((s) => (
                          <motion.div
                            key={s.step}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + s.step * 0.1 }}
                            className="flex items-start gap-3.5 relative"
                          >
                            <div className="w-[30px] h-[30px] rounded-full bg-[#0D84FF]/10 border-2 border-[#0D84FF]/30 flex items-center justify-center shrink-0 z-10">
                              <s.icon size={14} style={{ color: "#0D84FF" }} />
                            </div>
                            <div className="pt-0.5">
                              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{s.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{s.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-4 pt-2 bg-white dark:bg-[#1A1F2E]">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/needit-mission")}
                      className="w-full py-3 rounded-2xl text-white font-semibold text-sm shadow-sm"
                      style={{ background: "#0D84FF" }}
                    >
                      {t("missions.letsGo")}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: "#64748B" }}>
                  {t("common.noResult")}
                </p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-4 mt-2"
              >
                {sortedMissions.map((m) => {
                  const st = statusLabels[m.status] || statusLabels.pending;
                  return (
                    <motion.div
                      key={m.id}
                      variants={staggerItem}
                      whileHover={{ y: -2 }}
                      className="relative overflow-hidden rounded-3xl"
                    >
                      {/* Swipe reveal actions */}
                      {m.user_id === user?.id && m.status === "pending" && (
                        <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0 rounded-3xl overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/needit-mission/${m.id}`); }}
                            className="w-[72px] flex flex-col items-center justify-center gap-1 text-primary-foreground text-xs font-semibold bg-gradient-to-br from-primary to-secondary"
                          >
                            <Pencil size={18} /> Éditer
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}
                            className="w-[72px] flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold bg-gradient-to-br from-rose-500 to-red-500"
                          >
                            <Trash2 size={18} /> Supprimer
                          </button>
                        </div>
                      )}

                      <motion.div
                        drag={m.user_id === user?.id && m.status === "pending" ? "x" : false}
                        dragConstraints={{ left: -144, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -60) {
                            setSwipedId(m.id);
                          } else {
                            setSwipedId(null);
                          }
                        }}
                        animate={{ x: swipedId === m.id ? -144 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        onClick={() => {
                          if (swipedId === m.id) { setSwipedId(null); return; }
                          navigate(`/mission/${m.id}`);
                        }}
                        className="relative bg-card/95 backdrop-blur-sm border border-border/50 rounded-3xl p-5 shadow-soft hover:shadow-elevated cursor-pointer transition-all duration-300 z-10 overflow-hidden"
                      >
                        {/* Decorative gradient aura */}
                        <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-secondary/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-primary/10 blur-3xl" />

                        <div className="relative flex items-start gap-4">
                          {/* Product image with gradient halo */}
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 blur-md opacity-60" />
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt="Produit"
                                className="relative w-[72px] h-[72px] rounded-2xl object-cover ring-2 ring-card shadow-soft"
                              />
                            ) : (
                              <div className="relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 ring-2 ring-card shadow-soft flex items-center justify-center">
                                <CategoryIcon category={m.category_path} size={56} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[17px] font-extrabold text-foreground leading-tight truncate tracking-tight">
                                  {m.product_name || m.category_path?.[m.category_path.length - 1] || "Produit non référencé"}
                                </p>
                                {m.category_path && m.category_path.length > 0 && (
                                  <p className="text-[12px] mt-1 truncate text-muted-foreground font-medium uppercase tracking-wide">
                                    {m.category_path.join(" • ")}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm ${st.bgClass} ${st.textColor}`}>
                                  {st.label}
                                </span>
                                {m.status === "pending" && m.user_id === user?.id && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/needit-mission/${m.id}`); }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-primary/10 text-primary"
                                    aria-label="Modifier cette mission"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Location + timing pills */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/80 bg-muted/60 rounded-full px-2.5 py-1">
                                <MapPin size={12} className="text-primary" /> {m.country}{m.city ? `, ${m.city}` : ""}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/80 bg-muted/60 rounded-full px-2.5 py-1">
                                <Clock size={12} className="text-secondary" /> {m.timing === "asap" ? t("missions.asap") : t("missions.scheduled")}
                              </span>
                            </div>

                            {/* Price badge */}
                            {m.prix_max && (
                              <div className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 rounded-full px-3 py-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{t("missions.priceMax")}</span>
                                <span className="text-[14px] font-extrabold">{m.prix_max}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Voyageur availability alert */}
                        {m.status === "pending" && (
                          <div className="relative mt-4">
                            <VoyageurAvailability country={m.country} city={m.city} variant="full" onShare={() => handleShare(m)} />
                          </div>
                        )}

                        {/* EAN info */}
                        {m.ean_code && (
                          <p className="relative text-xs mt-3 font-mono flex items-center gap-1.5 text-muted-foreground">
                            <ScanBarcode size={12} /> EAN: {m.ean_code}
                            {m.ean_verified && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </p>
                        )}

                        {/* EAN scanner for voyageur */}
                        {m.status === "accepted" && m.voyageur_id === user?.id && !m.ean_verified && (
                          <div className="relative mt-3">
                            {scanningMissionId === m.id ? (
                              <AnimatePresence>
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                  <EanScanner
                                    mode={m.ean_code ? "verify" : "scan"}
                                    expectedEan={m.ean_code || undefined}
                                    onVerified={async (ean) => {
                                      await supabase.from("needit_missions").update({ ean_verified: true } as any).eq("id", m.id);
                                      loadMissions();
                                      setScanningMissionId(null);
                                    }}
                                    onProductFound={async (product) => {
                                      await supabase.from("needit_missions").update({ ean_code: product.ean_code, ean_verified: true } as any).eq("id", m.id);
                                      loadMissions();
                                      setScanningMissionId(null);
                                    }}
                                  />
                                  <button onClick={(e) => { e.stopPropagation(); setScanningMissionId(null); }} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground">
                                    Fermer le scanner
                                  </button>
                                </motion.div>
                              </AnimatePresence>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setScanningMissionId(m.id); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                              >
                                <ScanBarcode size={16} />
                                {m.ean_code ? "Vérifier le produit (EAN)" : "Scanner le code-barres"}
                              </button>
                            )}
                          </div>
                        )}

                        {m.ean_verified && (
                          <div className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-3 py-1.5">
                            <CheckCircle2 size={14} /> Produit vérifié par scan
                          </div>
                        )}

                        {/* Date footer */}
                        <div className="relative mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground font-medium">
                            Créée le {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          <span className="text-[11px] text-primary font-semibold inline-flex items-center gap-1">
                            Voir détail →
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </main>
        </PullToRefresh>
      </PageTransition>
      <BottomNav />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. La mission sera annulée définitivement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MesNeeditMissions;
