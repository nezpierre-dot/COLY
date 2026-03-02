import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Clock, Package, Loader2, ScanBarcode, CheckCircle2, Pencil, Users } from "lucide-react";
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
import { useTranslation } from "@/hooks/useTranslation";

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
  pending: { label: "En attente", bgClass: "bg-[#0D84FF]", textColor: "text-white" },
  accepted: { label: "Acceptée", bgClass: "bg-[#30D158]", textColor: "text-white" },
  completed: { label: "Terminée", bgClass: "bg-[#64748B]", textColor: "text-white" },
  cancelled: { label: "Annulée", bgClass: "bg-[#FF453A]", textColor: "text-white" },
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

  const filteredMissions = activeFilter === "all"
    ? missions.filter(m => m.status !== "cancelled")
    : missions.filter(m => m.status === activeFilter);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1115] pb-24">
      <PageTransition>
        <PullToRefresh onRefresh={loadMissions}>
          {/* ─── Header ─── */}
          <div className="bg-[#F8FAFC] dark:bg-[#0F1115] px-5 pt-12 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  aria-label="Retour"
                >
                  <ArrowLeft size={28} style={{ color: "#0D84FF" }} strokeWidth={2} />
                </button>
                <div>
                   <h1 className="text-[22px] font-bold leading-tight text-[#0F172A] dark:text-[#F1F5F9]">
                    {t("missions.title")}
                  </h1>
                  <p className="text-[14px] mt-0.5" style={{ color: "#64748B" }}>
                    {t("missions.subtitle")}
                  </p>
                </div>
              </div>
              <NotificationBell />
            </div>

            {/* ─── Tabs segment control ─── */}
            <div className="flex gap-1.5 bg-[#E2E8F0] dark:bg-[#1A1F2E] rounded-2xl p-1">
              {getFilterTabs(t).map((tab) => {
                const count = counts[tab.key];
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive
                        ? "bg-[#0D84FF] text-white shadow-md"
                        : "text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]"
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive ? "bg-white/25 text-white" : "bg-[#0D84FF]/15 text-[#0D84FF]"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5">
            {/* ─── New mission button ─── */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/needit-mission")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[17px] text-white shadow-lg mt-4 mb-6 transition-opacity hover:opacity-90"
              style={{ background: "#0D84FF" }}
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
                  action={
                    <button
                      onClick={() => navigate("/needit-mission")}
                      className="px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-lg"
                      style={{ background: "#0D84FF" }}
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
                {filteredMissions.map((m) => {
                  const st = statusLabels[m.status] || statusLabels.pending;
                  return (
                    <motion.div
                      key={m.id}
                      variants={staggerItem}
                      className="bg-white dark:bg-[#1A1F2E] border border-[#E2E8F0] dark:border-[#2A3245] rounded-2xl p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {/* Product image */}
                        {m.photo_url && (
                          <img
                            src={m.photo_url}
                            alt="Produit"
                            className="w-[68px] h-[68px] rounded-xl object-cover shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[18px] font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-tight truncate">
                                {m.product_name || m.category_path?.[m.category_path.length - 1] || "Produit non référencé"}
                              </p>
                              {m.category_path && m.category_path.length > 0 && (
                                <p className="text-[13px] mt-1 truncate" style={{ color: "#64748B" }}>
                                  {m.category_path.join(" → ")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${st.bgClass} ${st.textColor}`}>
                                {st.label}
                              </span>
                              {m.status === "pending" && m.user_id === user?.id && (
                                <button
                                  onClick={() => navigate(`/needit-mission/${m.id}`)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#0D84FF]/10"
                                  style={{ color: "#0D84FF" }}
                                  aria-label="Modifier cette mission"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Location + timing */}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-[13px]" style={{ color: "#64748B" }}>
                              <MapPin size={14} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </span>
                            <span className="flex items-center gap-1 text-[13px]" style={{ color: "#64748B" }}>
                              <Clock size={14} /> {m.timing === "asap" ? t("missions.asap") : t("missions.scheduled")}
                            </span>
                          </div>

                          {/* Price */}
                          {m.prix_max && (
                            <p className="text-[15px] font-bold mt-2" style={{ color: "#30D158" }}>
                              {t("missions.priceMax")} : {m.prix_max}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Voyageur availability alert */}
                      {m.status === "pending" && (
                        <div className="mt-3">
                          <VoyageurAvailability country={m.country} city={m.city} variant="full" />
                        </div>
                      )}

                      {/* EAN info */}
                      {m.ean_code && (
                        <p className="text-xs mt-2 font-mono flex items-center gap-1.5" style={{ color: "#64748B" }}>
                          <ScanBarcode size={12} /> EAN: {m.ean_code}
                          {m.ean_verified && <CheckCircle2 size={14} style={{ color: "#30D158" }} />}
                        </p>
                      )}

                      {/* EAN scanner for voyageur */}
                      {m.status === "accepted" && m.voyageur_id === user?.id && !m.ean_verified && (
                        <div className="mt-3">
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
                                <button onClick={() => setScanningMissionId(null)} className="w-full mt-2 text-xs hover:text-[#0F172A] dark:hover:text-[#F1F5F9]" style={{ color: "#64748B" }}>
                                  Fermer le scanner
                                </button>
                              </motion.div>
                            </AnimatePresence>
                          ) : (
                            <button
                              onClick={() => setScanningMissionId(m.id)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-colors"
                              style={{ background: "rgba(13,132,255,0.1)", color: "#0D84FF" }}
                            >
                              <ScanBarcode size={16} />
                              {m.ean_code ? "Vérifier le produit (EAN)" : "Scanner le code-barres"}
                            </button>
                          )}
                        </div>
                      )}

                      {m.ean_verified && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#30D158" }}>
                          <CheckCircle2 size={14} /> Produit vérifié par scan
                        </div>
                      )}

                      {/* Date */}
                      <p className="text-[12px] mt-3" style={{ color: "#64748B" }}>
                        {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </PullToRefresh>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default MesNeeditMissions;
