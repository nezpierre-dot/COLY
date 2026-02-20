import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Search, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const MOCK_VOYAGES = [
  { id: 1, from: "Genève", to: "Casablanca", date: "06/01/2025", time: "18h30", location: "Aeroport International de genève (GVA)", fillRate: 75 },
  { id: 2, from: "Paris", to: "Tunis", date: "12/02/2025", time: "09h00", location: "Aeroport CDG Terminal 2E", fillRate: 40 },
];

const MOCK_DEMANDES = [
  { id: 1, icon: "🛍️", item: "Sac de luxe", client: "Christine G", price: 150, type: "Dépot", status: "accepted" },
  { id: 2, icon: "📄", item: "Permis de conduire", client: "Sarah S", price: 50, type: "Retrait", status: "pending" },
  { id: 3, icon: "🔑", item: "Cléfs", client: "Albert D", price: 20, type: "Envoi", status: "accepted" },
  { id: 4, icon: "📁", item: "Porte Document", client: "Yasmina F", price: 20, type: "Dépot", status: "pending" },
];

const MOCK_ENVOIS = [
  { id: "147521", date: "16/08/25", time: "10h00", item: "Porte Documents", from: "Paris", to: "Marseille", station: "TGV PARIS GARE DE LYON", status: "accepted", voyageur: "215445" },
  { id: "156324", date: "17/08/25", time: "14h10", item: "Porte Documents", from: "Marseille", to: "Paris", station: "TGV GARE SAINT CHARLES", status: "pending", voyageur: null },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();
  const isVoyageur = roles.includes("voyageur");

  // Voyageur filters
  const [demandFilter, setDemandFilter] = useState<"all" | "accepted" | "pending">("all");
  const [selectedVoyage, setSelectedVoyage] = useState<number>(MOCK_VOYAGES[0]?.id);

  // Demandeur filters
  const [searchCity, setSearchCity] = useState("");
  const [filterEnCours, setFilterEnCours] = useState(true);
  const [filterEnAttente, setFilterEnAttente] = useState(true);
  const [filterTout, setFilterTout] = useState(false);

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

  const filteredDemandes = MOCK_DEMANDES.filter((d) => {
    if (demandFilter === "all") return true;
    return d.status === demandFilter;
  });

  const filteredEnvois = MOCK_ENVOIS.filter((e) => {
    const matchCity = !searchCity || e.from.toLowerCase().includes(searchCity.toLowerCase()) || e.to.toLowerCase().includes(searchCity.toLowerCase());
    if (filterTout) return matchCity;
    const matchStatus =
      (filterEnCours && e.status === "accepted") ||
      (filterEnAttente && e.status === "pending");
    return matchCity && matchStatus;
  });

  const currentVoyage = MOCK_VOYAGES.find((v) => v.id === selectedVoyage);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {isVoyageur ? "Espace Relayeur" : "Espace Demandeur"}
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleRole}
              className={`w-14 h-8 rounded-full relative transition-colors ${isVoyageur ? "bg-coly-purple" : "bg-muted"}`}>
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
            {/* Trip selector tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MOCK_VOYAGES.map((v) => (
                <button key={v.id} onClick={() => setSelectedVoyage(v.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedVoyage === v.id ? "bg-coly-blue text-white" : "bg-muted text-muted-foreground"}`}>
                  {v.from} → {v.to}
                </button>
              ))}
            </div>

            <h2 className="text-lg text-muted-foreground text-center">Voyages en cours</h2>

            {/* Selected voyage card */}
            {currentVoyage && (
              <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(214 80% 52%), hsl(180 60% 60%))" }}>
                <div className="absolute top-4 left-4 grid grid-cols-3 gap-1 opacity-30">
                  {Array.from({ length: 9 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />)}
                </div>
                <div className="absolute bottom-8 left-1/2 w-32 h-32 rounded-full bg-white/10" />

                <h3 className="font-bold text-lg mb-1">{currentVoyage.from} &gt; {currentVoyage.to}</h3>
                <p className="text-sm opacity-90">{currentVoyage.date} à {currentVoyage.time}</p>
                <p className="text-sm opacity-90 mb-4">{currentVoyage.location}</p>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Taux de remplissage</span>
                    <span className="font-bold">{currentVoyage.fillRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/20">
                    <div className="h-2 rounded-full bg-white transition-all duration-500" style={{ width: `${currentVoyage.fillRate}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(270 60% 70%)" strokeWidth="3" strokeDasharray="100, 100" opacity="0.3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(270 60% 70%)" strokeWidth="3" strokeDasharray={`${currentVoyage.fillRate}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{currentVoyage.fillRate}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Demand filter tabs */}
            <div className="flex gap-2">
              {([["all", "Tout"], ["accepted", "Acceptées"], ["pending", "En attente"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setDemandFilter(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${demandFilter === key ? "bg-coly-purple text-white" : "bg-muted text-muted-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Demandes list */}
            <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(214 80% 52%), hsl(180 60% 60%))" }}>
              <div className="absolute bottom-12 right-0 w-40 h-40 rounded-full bg-white/10" />
              {currentVoyage && (
                <>
                  <h3 className="font-bold text-white mb-1">{currentVoyage.from} &gt; {currentVoyage.to}</h3>
                  <p className="text-sm text-white/80 mb-4">{currentVoyage.date} à {currentVoyage.time} — {currentVoyage.location}</p>
                </>
              )}
              <div className="space-y-2">
                {filteredDemandes.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-4">Aucune demande trouvée</p>
                ) : (
                  filteredDemandes.map((d) => (
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
                        <p className={`text-xs ${d.status === "accepted" ? "text-green-300" : "text-yellow-300"}`}>
                          {d.status === "accepted" ? "Acceptée" : "En attente"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full text-center text-white font-bold text-sm mt-4 py-2 hover:opacity-80">
                VOIR LES DEMANDES
              </button>
            </div>

            {/* New trip */}
            <button onClick={() => navigate("/new-trip")}
              className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/30 transition-colors">
              Je propose un nouveau voyage <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          /* ============ DEMANDEUR ============ */
          <div className="space-y-4">
            <button onClick={() => navigate("/needit-mission")}
              className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors">
              Je propose une mission d'achat Needit
            </button>
            <button className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/30 transition-colors">
              Mes Missions Needit <ArrowRight size={20} />
            </button>

            <div className="h-4" />

            <button onClick={() => navigate("/send-coly")}
              className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors">
              Je propose un envoi COLY
            </button>

            {/* Mes Envois section */}
            <div className="bg-muted/50 rounded-2xl p-4 mt-2">
              <h3 className="text-lg font-bold text-foreground text-center mb-4">Mes Envois</h3>

              {/* Search bar */}
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-3">
                <Filter size={16} className="text-muted-foreground" />
                <input
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="par ville : de départ, d'arrivée .."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
                <Search size={16} className="text-muted-foreground" />
              </div>

              {/* Status filters */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={filterEnCours} onCheckedChange={(v) => { setFilterEnCours(!!v); setFilterTout(false); }} />
                  en cours
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={filterEnAttente} onCheckedChange={(v) => { setFilterEnAttente(!!v); setFilterTout(false); }} />
                  en attente
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={filterTout} onCheckedChange={(v) => { setFilterTout(!!v); if (v) { setFilterEnCours(false); setFilterEnAttente(false); } }} />
                  tout
                </label>
              </div>

              {/* Envoi cards */}
              <div className="space-y-3">
                {filteredEnvois.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun envoi trouvé</p>
                ) : (
                  filteredEnvois.map((e) => (
                    <div key={e.id} className="rounded-2xl p-4 text-white relative overflow-hidden"
                      style={{ background: e.status === "accepted"
                        ? "linear-gradient(135deg, hsl(214 70% 55%), hsl(180 60% 55%))"
                        : "linear-gradient(135deg, hsl(140 50% 50%), hsl(160 60% 55%))" }}>
                      <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-white/10" />
                      <p className="text-xs opacity-80">coly n° {e.id}</p>
                      <p className="text-xl font-bold">Départ : {e.date}</p>
                      <p className="text-sm opacity-90">à {e.time}</p>
                      <p className="font-bold mt-1">{e.item}</p>
                      <p className="text-sm font-medium">{e.from}&gt; {e.to}</p>
                      <p className="text-sm opacity-90">{e.station}</p>
                      <p className="text-xs mt-2 opacity-80">
                        {e.status === "accepted"
                          ? `voyageur n°${e.voyageur} demande accepté`
                          : "en attente de validation voyageur"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
