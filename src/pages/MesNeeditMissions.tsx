import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Clock, Package, Loader2, ScanBarcode, CheckCircle2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EanScanner from "@/components/EanScanner";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import VoyageurAvailability from "@/components/VoyageurAvailability";

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

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-accent/15 text-accent" },
  accepted: { label: "Acceptée", color: "bg-primary/15 text-primary" },
  completed: { label: "Terminée", color: "bg-green-500/15 text-green-600" },
  cancelled: { label: "Annulée", color: "bg-destructive/15 text-destructive" },
};

const filterTabs = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "accepted", label: "En cours" },
  { key: "completed", label: "Terminées" },
] as const;

type FilterKey = (typeof filterTabs)[number]["key"];

const MesNeeditMissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Counts per status
  const counts = {
    all: missions.filter(m => m.status !== "cancelled").length,
    pending: missions.filter(m => m.status === "pending").length,
    accepted: missions.filter(m => m.status === "accepted").length,
    completed: missions.filter(m => m.status === "completed").length,
  };

  // Filtered missions
  const filteredMissions = activeFilter === "all"
    ? missions.filter(m => m.status !== "cancelled")
    : missions.filter(m => m.status === activeFilter);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-[26px] font-bold text-foreground leading-tight">Mes Missions NeedIt</h1>
            <p className="text-sm text-muted-foreground">Faites acheter vos produits par un voyageur</p>
          </div>
        </div>

        {/* Sticky filter tabs with counters */}
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map((tab) => {
              const count = counts[tab.key];
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* New mission button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/needit-mission")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity shadow-lg mt-4 mb-6"
        >
          <Plus size={22} /> Nouvelle mission
        </motion.button>

        {/* Missions list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : missions.length === 0 ? (
          <div className="py-6 px-2">
            <EmptyState
              icon={Package}
              title="Aucune mission pour le moment"
              description="Faites acheter ce que vous voulez par un voyageur, où que ce soit dans le monde."
              action={
                <button onClick={() => navigate("/needit-mission")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                  <Plus size={20} className="inline mr-1.5 -mt-0.5" /> Créer ma première mission
                </button>
              }
            />

            {/* How it works guide */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 rounded-2xl overflow-hidden border border-border shadow-sm"
            >
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Comment ça marche ?</p>
                  <p className="text-[11px] text-muted-foreground">4 étapes simples pour ta première mission</p>
                </div>
              </div>
              <div className="bg-card px-5 py-4">
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
                  <div className="space-y-5">
                    {[
                      { step: 1, emoji: "🌍", title: "Choisis un pays", desc: "Espagne, Turquie, Japon…" },
                      { step: 2, emoji: "🛍️", title: "Sélectionne un produit", desc: "Catalogue ou description libre" },
                      { step: 3, emoji: "📸", title: "Ajoute une photo", desc: "Aide le voyageur à identifier le bon article" },
                      { step: 4, emoji: "🤝", title: "Un voyageur accepte", desc: "Coordonnez-vous via la messagerie" },
                    ].map((s) => (
                      <motion.div
                        key={s.step}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 + s.step * 0.1 }}
                        className="flex items-start gap-3.5 relative"
                      >
                        <div className="w-[30px] h-[30px] rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0 z-10 text-sm">
                          {s.emoji}
                        </div>
                        <div className="pt-0.5">
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-muted/40 border-t border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Ex :</span> « Huile d'olive premium, Espagne, max 25 € » — un voyageur passant par Barcelone l'achète pour vous !
                </p>
              </div>
              <div className="px-5 pb-4 pt-2 bg-card">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/needit-mission")}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
                >
                  🚀 C'est parti !
                </motion.button>
              </div>
            </motion.div>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Aucune mission {filterTabs.find(t => t.key === activeFilter)?.label.toLowerCase()}</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3 mt-2"
          >
            {filteredMissions.map((m) => {
              const st = statusLabels[m.status] || statusLabels.pending;
              return (
                <motion.div key={m.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-base font-bold text-foreground">
                        {m.product_name || m.category_path?.[m.category_path.length - 1] || "Produit non référencé"}
                      </p>
                      {m.category_path && m.category_path.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.category_path.join(" → ")}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                    {m.status === "pending" && m.user_id === user?.id && (
                      <button
                        onClick={() => navigate(`/needit-mission/${m.id}`)}
                        className="w-7 h-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                        aria-label="Modifier cette mission"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} /> {m.country}{m.city ? `, ${m.city}` : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> {m.timing === "asap" ? "Dès que possible" : "Date programmée"}
                    </span>
                  </div>

                  {m.prix_max && (
                    <p className="text-base font-semibold text-foreground mt-3">Prix max : {m.prix_max}</p>
                  )}

                  {m.status === "pending" && (
                    <div className="mt-2">
                      <VoyageurAvailability country={m.country} city={m.city} variant="full" />
                    </div>
                  )}

                  {m.ean_code && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono flex items-center gap-1.5">
                      <ScanBarcode size={12} /> EAN: {m.ean_code}
                      {m.ean_verified && <CheckCircle2 size={14} className="text-green-500" />}
                    </p>
                  )}

                  {m.photo_url && (
                    <img src={m.photo_url} alt="Produit" className="mt-3 h-20 rounded-xl object-cover" />
                  )}

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
                            <button onClick={() => setScanningMissionId(null)} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground">
                              Fermer le scanner
                            </button>
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <button
                          onClick={() => setScanningMissionId(m.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                        >
                          <ScanBarcode size={16} />
                          {m.ean_code ? "Vérifier le produit (EAN)" : "Scanner le code-barres"}
                        </button>
                      )}
                    </div>
                  )}

                  {m.ean_verified && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <CheckCircle2 size={14} /> Produit vérifié par scan
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default MesNeeditMissions;
