import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

// Mock data for demo
const MOCK_VOYAGES = [
  {
    id: 1,
    from: "Genève",
    to: "Casablanca",
    date: "06/01/2025",
    time: "18h30",
    location: "Aeroport International de genève (GVA)",
    fillRate: 75,
  },
];

const MOCK_DEMANDES = [
  { id: 1, icon: "🛍️", item: "Sac de luxe", client: "Christine G", price: 150, type: "Dépot" },
  { id: 2, icon: "📄", item: "Permis de conduire", client: "Sarah S", price: 50, type: "Retrait" },
  { id: 3, icon: "🔑", item: "Cléfs", client: "Albert D", price: 20, type: "Envoi" },
  { id: 4, icon: "📁", item: "Porte Document", client: "Yasmina F", price: 20, type: "Dépot" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();

  const isVoyageur = roles.includes("voyageur");

  const toggleRole = async () => {
    if (!user) return;
    const newRole = isVoyageur ? "demandeur" : "voyageur";
    await supabase.from("user_roles").delete().eq("user_id", user.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: newRole });
    if (error) toast.error("Erreur lors du changement de rôle");
    else window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {isVoyageur ? "Espace Relayeur" : "Espace Demandeur"}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRole}
              className={`w-14 h-8 rounded-full relative transition-colors ${isVoyageur ? "bg-coly-purple" : "bg-muted"}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow absolute top-1 transition-transform ${isVoyageur ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {isVoyageur ? (
          /* ============ VOYAGEUR / RELAYEUR ============ */
          <div className="space-y-6">
            <h2 className="text-lg text-muted-foreground text-center">Voyages en cours</h2>

            {MOCK_VOYAGES.map((v) => (
              <div key={v.id} className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(214 80% 52%), hsl(180 60% 60%))" }}>
                {/* Decorative circles */}
                <div className="absolute top-4 left-4 grid grid-cols-3 gap-1 opacity-30">
                  {Array.from({ length: 9 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />)}
                </div>
                <div className="absolute bottom-8 left-1/2 w-32 h-32 rounded-full bg-white/10" />

                <h3 className="font-bold text-lg mb-1">{v.from} &gt; {v.to}</h3>
                <p className="text-sm opacity-90">{v.date} à {v.time}</p>
                <p className="text-sm opacity-90 mb-4">{v.location}</p>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Taux de remplissage</span>
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(270 60% 70%)" strokeWidth="3" strokeDasharray="100, 100" opacity="0.3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(270 60% 70%)" strokeWidth="3" strokeDasharray={`${v.fillRate}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{v.fillRate}%</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Demandes on this trip */}
            {MOCK_VOYAGES.length > 0 && (
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(214 80% 52%), hsl(180 60% 60%))" }}>
                <div className="absolute bottom-12 right-0 w-40 h-40 rounded-full bg-white/10" />
                <h3 className="font-bold text-white mb-1">{MOCK_VOYAGES[0].from} &gt; {MOCK_VOYAGES[0].to}</h3>
                <p className="text-sm text-white/80 mb-4">{MOCK_VOYAGES[0].date} à 21h30 — {MOCK_VOYAGES[0].location}</p>

                <div className="space-y-2">
                  {MOCK_DEMANDES.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{d.icon}</span>
                        <div>
                          <p className="font-semibold text-white text-sm">{d.item}</p>
                          <p className="text-xs text-white/70">{d.client}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">+{d.price}€</p>
                        <p className="text-xs text-white/70">{d.type}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full text-center text-white font-bold text-sm mt-4 py-2 hover:opacity-80">
                  VOIR LES DEMANDES
                </button>
              </div>
            )}

            {/* New trip button */}
            <button
              onClick={() => navigate("/new-trip")}
              className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/30 transition-colors"
            >
              Je propose un nouveau voyage <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          /* ============ DEMANDEUR ============ */
          <div className="space-y-4">
            <button
              onClick={() => navigate("/needit-mission")}
              className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors"
            >
              Je propose une mission d'achat Needit
            </button>
            <button className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/30 transition-colors">
              Mes Missions Needit <ArrowRight size={20} />
            </button>

            <div className="h-8" />

            <button
              onClick={() => navigate("/send-coly")}
              className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors"
            >
              Je propose un envoi COLY
            </button>
            <button className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg hover:bg-coly-purple/30 transition-colors">
              Mes Envois COLY
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
