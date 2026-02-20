import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Search, Filter, MapPin, Clock, Plane, Map, Heart, Sparkles, Star, TrendingUp, Package, ShoppingBag, Zap, Calendar, Users, Plus } from "lucide-react";
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
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  departure_time: string | null;
  departure_address: string | null;
  transport_method: string;
  status: string;
};

// --- Mock data (demandeur) ---
const MOCK_ENVOIS = [
  { id: "147521", date: "16/08/25", time: "10h00", item: "Porte Documents", from: "Paris", to: "Marseille", station: "TGV PARIS GARE DE LYON", status: "accepted", voyageur: "215445" },
  { id: "156324", date: "17/08/25", time: "14h10", item: "Porte Documents", from: "Marseille", to: "Paris", station: "TGV GARE SAINT CHARLES", status: "pending", voyageur: null },
];

// --- Voyageur Quick Stats ---
const QuickStats = ({ voyagesCount, colisCount, matchCount }: { voyagesCount: number; colisCount: number; matchCount: number }) => (
  <div className="grid grid-cols-3 gap-2 mb-4">
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 text-center">
      <p className="text-xl font-bold text-primary">{voyagesCount}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Voyages</p>
    </div>
    <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-3 text-center">
      <p className="text-xl font-bold text-secondary">{colisCount}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Colis dispo</p>
    </div>
    <div className="bg-accent/10 border border-accent/20 rounded-2xl p-3 text-center">
      <p className="text-xl font-bold text-accent">{matchCount}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Matchs</p>
    </div>
  </div>
);

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
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/15 rounded-2xl p-3 animate-in fade-in duration-500">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-accent mb-0.5">Recommandation IA</p>
          <p className="text-xs text-foreground leading-relaxed">{rec.text}</p>
          <button
            onClick={rec.action}
            className="mt-1.5 text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
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
            <span className="text-[11px] font-medium text-foreground">{fav.from} → {fav.to}</span>
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

  const [searchCity, setSearchCity] = useState("");
  const [filterEnCours, setFilterEnCours] = useState(true);
  const [filterEnAttente, setFilterEnAttente] = useState(true);
  const [filterTout, setFilterTout] = useState(false);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isVoyageur) return;
    const loadNeedit = async () => {
      const { data } = await supabase
        .from("needit_missions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (data) setNeeditMissions(data);
    };
    const loadShipments = async () => {
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="px-5 pt-10" id="main-content" role="main" aria-label="Tableau de bord">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isVoyageur ? "Espace Voyageur" : "Espace Demandeur"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isVoyageur ? "Gérez vos trajets et opportunités" : "Envoyez vos colis et missions"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={toggleRole} aria-label={`Changer vers ${isVoyageur ? "demandeur" : "voyageur"}`}
              className={`w-12 h-7 rounded-full relative transition-colors ${isVoyageur ? "bg-secondary" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-background shadow-sm absolute top-1 transition-transform ${isVoyageur ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" aria-label="Se déconnecter">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isVoyageur ? (
          /* ============ VOYAGEUR ============ */
          <div className="space-y-4">
            {/* Quick Stats */}
            <QuickStats
              voyagesCount={voyages.length}
              colisCount={pendingShipments.length}
              matchCount={totalMatches}
            />

            {/* AI Recommendation */}
            <AiRecommendation isVoyageur={true} />

            {/* Favorite Routes */}
            <FavoriteRoutes />

            <Tabs defaultValue="voyages" className="space-y-3">
              <TabsList className="w-full bg-muted/70 rounded-xl p-1 h-auto">
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
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Plane size={28} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aucun voyage enregistré</p>
                    <p className="text-xs text-muted-foreground mt-1">Commencez par ajouter votre premier trajet</p>
                  </div>
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
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(v.departure_city, v.arrival_city); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                              fav ? "bg-accent/30 text-accent" : "bg-primary-foreground/15 text-primary-foreground/60 hover:text-accent"
                            }`}
                          >
                            <Heart size={12} fill={fav ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </button>
                    );
                  })
                )}

                <button onClick={() => navigate("/new-trip")}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-secondary/40 text-secondary font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary/10 transition-colors">
                  <Plus size={18} /> Ajouter un voyage
                </button>
              </TabsContent>

              {/* ---- Colis tab ---- */}
              <TabsContent value="colis" className="space-y-3 mt-0">
                {/* Matched shipments */}
                {matchedShipments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> Correspondances ({matchedShipments.length})
                    </h3>
                    {matchedShipments.map((s: any) => (
                      <div key={s.id} className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                            <p className="font-semibold text-foreground text-sm truncate">
                              {s.arrival_city}, {s.arrival_country}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.insured && <span className="text-[9px]">🛡</span>}
                            <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">{s.size}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {formatDate(s.departure_date)}
                          </span>
                          <span className="font-medium text-foreground">{s.tarif === "custom" ? "Sur devis" : s.tarif}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Other shipments */}
                {unmatchedShipments.length > 0 && (
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
                              {s.arrival_city}, {s.arrival_country}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDate(s.departure_date)} · Taille {s.size}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.insured && <span className="text-[9px]">🛡</span>}
                            <span className="text-xs font-semibold text-foreground">{s.tarif === "custom" ? "Sur devis" : s.tarif}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingShipments.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Package size={28} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aucun colis disponible</p>
                    <p className="text-xs text-muted-foreground mt-1">Les envois des demandeurs apparaîtront ici</p>
                  </div>
                )}
              </TabsContent>

              {/* ---- Carte tab ---- */}
              <TabsContent value="carte" className="space-y-3 mt-0">
                <VoyageMap
                  voyages={voyages}
                  selectedVoyageId={selectedVoyage}
                  onSelectVoyage={setSelectedVoyage}
                />
                {currentVoyage && (
                  <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground text-sm">{currentVoyage.departure_city} → {currentVoyage.arrival_city}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(currentVoyage.departure_date)} {currentVoyage.departure_time ? `à ${currentVoyage.departure_time}` : ""}</p>
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
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${selectedVoyage === v.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {v.departure_city} → {v.arrival_city}
                      </button>
                    ))}
                  </div>
                )}

                {/* Matched NeedIt */}
                {matchedNeedit.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap size={12} className="text-accent" /> Missions correspondantes ({matchedNeedit.length})
                    </h3>
                    {matchedNeedit.map((m: any) => (
                      <div key={m.id} className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded-full shrink-0">MATCH</span>
                              <p className="font-semibold text-foreground text-sm truncate">
                                {m.product_name || m.category_path?.[m.category_path?.length - 1] || "Produit"}
                              </p>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </p>
                          </div>
                          {m.prix_max && <p className="text-sm font-bold text-foreground shrink-0">{m.prix_max}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Other NeedIt */}
                {unmatchedNeedit.length > 0 && (
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
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {m.country}{m.city ? `, ${m.city}` : ""}
                            </p>
                          </div>
                          {m.prix_max && <p className="text-sm font-bold text-foreground shrink-0">{m.prix_max}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {needitMissions.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag size={28} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aucune mission disponible</p>
                    <p className="text-xs text-muted-foreground mt-1">Les missions NeedIt apparaîtront ici</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* ============ DEMANDEUR ============ */
          <div className="space-y-4">
            {/* AI Recommendation */}
            <AiRecommendation isVoyageur={false} />

            {/* Favorite Routes */}
            <FavoriteRoutes />

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
