import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Clock, Package, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";

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
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-accent/15 text-accent" },
  accepted: { label: "Acceptée", color: "bg-primary/15 text-primary" },
  completed: { label: "Terminée", color: "bg-green-500/15 text-green-600" },
  cancelled: { label: "Annulée", color: "bg-destructive/15 text-destructive" },
};

const MesNeeditMissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState<NeeditMission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("needit_missions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setMissions(data as unknown as NeeditMission[]);
      setLoading(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("my-needit-missions")
      .on("postgres_changes", { event: "*", schema: "public", table: "needit_missions", filter: `user_id=eq.${user.id}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground flex-1">Mes Missions NeedIt</h1>
        </div>

        {/* New mission button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/needit-mission")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-medium text-lg hover:bg-primary/30 transition-colors mb-6"
        >
          <Plus size={20} /> Nouvelle mission
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
                <button onClick={() => navigate("/needit-mission")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  <Plus size={16} className="inline mr-1.5 -mt-0.5" /> Créer ma première mission
                </button>
              }
            />

            {/* AI Tutorial / Onboarding Steps */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-4 space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <p className="text-sm font-semibold text-foreground">Guide IA — Crée ta première mission</p>
              </div>

              <div className="space-y-3">
                {[
                  { step: 1, emoji: "🌍", title: "Choisis un pays", desc: "Ex : Espagne, Turquie, Japon…" },
                  { step: 2, emoji: "🛍️", title: "Sélectionne un produit", desc: "Navigue dans le catalogue ou décris ton besoin" },
                  { step: 3, emoji: "📸", title: "Ajoute une photo (optionnel)", desc: "Pour que le voyageur identifie le bon produit" },
                  { step: 4, emoji: "✅", title: "Publie & attends un match", desc: "Un voyageur acceptera ta mission !" },
                ].map((s) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + s.step * 0.12 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-base">
                      {s.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.step}. {s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl p-3 mt-2">
                <p className="text-xs text-muted-foreground italic">
                  💡 <span className="font-medium text-foreground">Exemple :</span> « Je cherche de l'huile d'olive premium en Espagne, max 25€ ». Un voyageur passant par Barcelone pourra l'acheter pour vous !
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/needit-mission")}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
              >
                🚀 C'est parti !
              </motion.button>
            </motion.div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {missions.map((m) => {
              const st = statusLabels[m.status] || statusLabels.pending;
              return (
                <motion.div key={m.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {m.product_name || m.category_path?.[m.category_path.length - 1] || "Produit non référencé"}
                      </p>
                      {m.category_path && m.category_path.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.category_path.join(" → ")}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {m.country}{m.city ? `, ${m.city}` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {m.timing === "asap" ? "Dès que possible" : "Date programmée"}
                    </span>
                  </div>

                  {m.prix_max && (
                    <p className="text-sm font-medium text-foreground mt-2">Prix max : {m.prix_max}</p>
                  )}

                  {m.photo_url && (
                    <img src={m.photo_url} alt="Produit" className="mt-3 h-20 rounded-xl object-cover" />
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
