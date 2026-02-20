import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Search, Filter, MapPin, Clock, Plane, Map, Heart, Sparkles, Star, TrendingUp, Package, ShoppingBag } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import VoyageMap from "@/components/VoyageMap";

// Dynamic voyages type
type Voyage = {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string | null;
  departure_address: string | null;
  transport_method: string;
  status: string;
};

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

// AI Recommendation Card
const AiRecommendation = ({ isVoyageur }: { isVoyageur: boolean }) => {
  const navigate = useNavigate();
  const recommendations = isVoyageur
    ? [
        { text: "Basé sur tes trajets, propose Paris → Dakar pour +45€/voyage", cta: "Voir le trajet", action: () => {} },
        { text: "3 demandes en attente sur ta zone. Active l'acceptation auto pour +20€", cta: "Paramètres", action: () => navigate("/settings") },
      ]
    : [
        { text: "Basé sur tes envois, essaie NeedIt pour une mission d'achat et gagne +20€", cta: "Essayer NeedIt", action: () => navigate("/needit-mission") },
        { text: "Tes envois fréquents vers Casablanca ? Ajoute-le en favori pour un accès rapide", cta: "Ajouter", action: () => {} },
      ];

  const rec = recommendations[Math.floor(Math.random() * recommendations.length)];

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/15 rounded-2xl p-4 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-accent mb-1">Recommandation IA</p>
          <p className="text-sm text-foreground">{rec.text}</p>
          <button
            onClick={rec.action}
            className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            {rec.cta} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Favorite Routes Section
const FavoriteRoutes = () => {
  const { favorites, removeFavorite } = useFavorites();
  const navigate = useNavigate();

  if (favorites.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
        <Star size={14} className="text-accent" /> Trajets favoris
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {favorites.map((fav) => (
          <div key={fav.id}
            className="shrink-0 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2 flex items-center gap-2"
          >
            <span className="text-xs font-medium text-foreground">{fav.from} → {fav.to}</span>
            <button onClick={() => removeFavorite(fav.id)} className="text-accent hover:text-destructive transition-colors">
              <Heart size={12} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();
  const { addFavorite, isFavorite } = useFavorites();
  const isVoyageur = roles.includes("voyageur");

  const [demandFilter, setDemandFilter] = useState<"all" | "accepted" | "pending">("all");
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState("");
  const [filterEnCours, setFilterEnCours] = useState(true);
  const [filterEnAttente, setFilterEnAttente] = useState(true);
  const [filterTout, setFilterTout] = useState(false);

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

  // NeedIt missions for voyageur view
  const [needitMissions, setNeeditMissions] = useState<any[]>([]);

  useEffect(() => {
    if (!isVoyageur) return;
    const load = async () => {
      const { data } = await supabase
        .from("needit_missions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (data) setNeeditMissions(data);
    };
    load();
    const ch = supabase
      .channel("voyageur-needit")
      .on("postgres_changes", { event: "*", schema: "public", table: "needit_missions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isVoyageur]);

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

  const currentVoyage = voyages.find((v) => v.id === selectedVoyage);

  const handleToggleFavorite = (from: string, to: string) => {
    if (!isFavorite(from, to)) {
      addFavorite(from, to);
      toast.success(`${from} → ${to} ajouté aux favoris`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="px-6 pt-12" id="main-content" role="main" aria-label="Tableau de bord">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {isVoyageur ? "Espace Relayeur" : "Espace Demandeur"}
          </h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={toggleRole} aria-label={`Changer vers ${isVoyageur ? "demandeur" : "voyageur"}`}
              className={`w-14 h-8 rounded-full relative transition-colors ${isVoyageur ? "bg-secondary" : "bg-muted"}`}>
              <div className={`w-6 h-6 rounded-full bg-background shadow absolute top-1 transition-transform ${isVoyageur ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" aria-label="Se déconnecter">
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="mb-4">
          <AiRecommendation isVoyageur={isVoyageur} />
        </div>

        {/* Favorite Routes */}
        <div className="mb-4">
          <FavoriteRoutes />
        </div>

        {isVoyageur ? (
          /* ============ VOYAGEUR / RELAYEUR ============ */
          <Tabs defaultValue="voyages" className="space-y-4">
            <TabsList className="w-full bg-muted rounded-2xl p-1 h-auto">
              <TabsTrigger value="voyages" className="flex-1 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Plane size={16} className="mr-1.5" /> Voyages
              </TabsTrigger>
              <TabsTrigger value="carte" className="flex-1 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Map size={16} className="mr-1.5" /> Carte
              </TabsTrigger>
              <TabsTrigger value="demandes" className="flex-1 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                <MapPin size={16} className="mr-1.5" /> Demandes
              </TabsTrigger>
            </TabsList>

            {/* ---- Voyages tab ---- */}
            <TabsContent value="voyages" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground text-center">Voyages en cours</p>

              {voyages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-6">Aucun voyage enregistré</p>
              )}

              {voyages.map((v) => {
                const isSelected = selectedVoyage === v.id;
                const fav = isFavorite(v.departure_city, v.arrival_city);
                return (
                  <div key={v.id} className="relative">
                    <button onClick={() => setSelectedVoyage(v.id)}
                      className={`w-full text-left rounded-2xl p-5 text-primary-foreground relative overflow-hidden transition-shadow ${isSelected ? "ring-2 ring-primary shadow-lg" : "opacity-80"}`}
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                      <div className="absolute top-4 left-4 grid grid-cols-3 gap-1 opacity-20">
                        {Array.from({ length: 9 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />)}
                      </div>
                      <div className="absolute bottom-6 left-1/2 w-28 h-28 rounded-full bg-primary-foreground/10" />

                      <h3 className="font-bold text-lg">{v.departure_city} → {v.arrival_city}</h3>
                      <div className="flex items-center gap-1.5 text-sm opacity-90 mt-1">
                        <Clock size={14} />
                        <span>{v.departure_date} {v.departure_time ? `à ${v.departure_time}` : ""}</span>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">{v.transport_method}</p>
                    </button>
                    {/* Favorite button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(v.departure_city, v.arrival_city); }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        fav ? "bg-accent/20 text-accent" : "bg-primary-foreground/20 text-primary-foreground/60 hover:text-accent"
                      }`}
                    >
                      <Heart size={14} fill={fav ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })}

              <button onClick={() => navigate("/new-trip")}
                className="w-full py-4 rounded-2xl bg-secondary/20 border border-secondary/30 text-secondary font-medium text-lg flex items-center justify-center gap-2 hover:bg-secondary/30 transition-colors">
                Je propose un nouveau voyage <ArrowRight size={20} />
              </button>
            </TabsContent>

            {/* ---- Carte tab ---- */}
            <TabsContent value="carte" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground text-center">Visualisez vos trajets sur la carte</p>
              <VoyageMap
                voyages={voyages}
                selectedVoyageId={selectedVoyage}
                onSelectVoyage={setSelectedVoyage}
              />
              {currentVoyage && (
                <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{currentVoyage.departure_city} → {currentVoyage.arrival_city}</p>
                      <p className="text-xs text-muted-foreground">{currentVoyage.departure_date} {currentVoyage.departure_time ? `à ${currentVoyage.departure_time}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{currentVoyage.transport_method}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ---- Demandes tab ---- */}
            <TabsContent value="demandes" className="space-y-4 mt-0">
              <div className="flex gap-2">
                {([["all", "Tout"], ["accepted", "Acceptées"], ["pending", "En attente"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDemandFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${demandFilter === key ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {currentVoyage && (
                <div className="rounded-2xl p-5 text-primary-foreground relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
                  <div className="absolute bottom-12 right-0 w-40 h-40 rounded-full bg-primary-foreground/10" />
                  <h3 className="font-bold">{currentVoyage.departure_city} → {currentVoyage.arrival_city}</h3>
                  <p className="text-sm opacity-80">{currentVoyage.departure_date} {currentVoyage.departure_time ? `à ${currentVoyage.departure_time}` : ""} — {currentVoyage.transport_method}</p>
                </div>
              )}

              <div className="space-y-2">
                {filteredDemandes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Aucune demande trouvée</p>
                ) : (
                  filteredDemandes.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-border shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{d.icon}</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{d.item}</p>
                          <p className="text-xs text-muted-foreground">{d.client} · {d.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">+{d.price}€</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.status === "accepted" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          {d.status === "accepted" ? "Acceptée" : "En attente"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* NeedIt Missions disponibles */}
              {needitMissions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <ShoppingBag size={16} className="text-accent" /> Missions NeedIt disponibles
                  </h3>
                  <div className="space-y-2">
                    {needitMissions.map((m: any) => (
                      <div key={m.id} className="bg-card rounded-xl px-4 py-3 border border-border shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {m.product_name || m.category_path?.[m.category_path?.length - 1] || "Produit"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={12} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </p>
                            {m.category_path?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">{m.category_path.join(" → ")}</p>
                            )}
                          </div>
                          {m.prix_max && <p className="text-sm font-bold text-foreground">{m.prix_max}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-1">
                {voyages.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVoyage(v.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedVoyage === v.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {v.departure_city} → {v.arrival_city}
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* ============ DEMANDEUR ============ */
          <div className="space-y-4">
            <button onClick={() => navigate("/needit-mission")}
              className="w-full py-4 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-medium text-lg hover:bg-primary/30 transition-colors">
              Je propose une mission d'achat Needit
            </button>
            <button onClick={() => navigate("/mes-missions-needit")}
              className="w-full py-4 rounded-2xl bg-secondary/20 border border-secondary/30 text-secondary font-medium text-lg flex items-center justify-center gap-2 hover:bg-secondary/30 transition-colors">
              Mes Missions Needit <ArrowRight size={20} />
            </button>

            <div className="h-4" />

            <button onClick={() => navigate("/send-coly")}
              className="w-full py-4 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-medium text-lg hover:bg-primary/30 transition-colors">
              Je propose un envoi COLY
            </button>

            {/* Mes Envois section */}
            <div className="bg-muted/50 rounded-2xl p-4 mt-2">
              <h3 className="text-lg font-bold text-foreground text-center mb-4">Mes Envois</h3>

              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-3">
                <Filter size={16} className="text-muted-foreground" aria-hidden="true" />
                <input
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="par ville : de départ, d'arrivée .."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  aria-label="Filtrer les envois par ville"
                />
                <Search size={16} className="text-muted-foreground" aria-hidden="true" />
              </div>

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

              <div className="space-y-3">
                {filteredEnvois.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun envoi trouvé</p>
                ) : (
                  filteredEnvois.map((e) => (
                    <div key={e.id} className="rounded-2xl p-4 text-primary-foreground relative overflow-hidden"
                      style={{ background: e.status === "accepted"
                        ? "linear-gradient(135deg, hsl(var(--primary)), hsl(210 60% 55%))"
                        : "linear-gradient(135deg, hsl(140 50% 45%), hsl(160 60% 50%))" }}>
                      <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-primary-foreground/10" />
                      {/* Favorite button */}
                      <button
                        onClick={() => handleToggleFavorite(e.from, e.to)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center"
                      >
                        <Heart size={12} fill={isFavorite(e.from, e.to) ? "currentColor" : "none"} className="text-primary-foreground" />
                      </button>
                      <p className="text-xs opacity-80">coly n° {e.id}</p>
                      <p className="text-xl font-bold">Départ : {e.date}</p>
                      <p className="text-sm opacity-90">à {e.time}</p>
                      <p className="font-bold mt-1">{e.item}</p>
                      <p className="text-sm font-medium">{e.from} → {e.to}</p>
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
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
