import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Clock, Package, Loader2 } from "lucide-react";
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
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground flex-1">Mes Missions NeedIt</h1>
        </div>

        {/* New mission button */}
        <button
          onClick={() => navigate("/needit-mission")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-medium text-lg hover:bg-primary/30 transition-colors mb-6"
        >
          <Plus size={20} /> Nouvelle mission
        </button>

        {/* Missions list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune mission pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">Créez votre première mission d'achat NeedIt</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((m) => {
              const st = statusLabels[m.status] || statusLabels.pending;
              return (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MesNeeditMissions;
