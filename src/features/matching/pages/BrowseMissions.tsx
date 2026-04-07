import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Package, ShoppingBag, Calendar, ArrowRight, X, SlidersHorizontal, Globe, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { hapticMedium } from "@/lib/haptics";
import VoyageurAvailability from "@/components/VoyageurAvailability";

interface PendingShipment {
  id: string;
  ref_number: string;
  arrival_city: string;
  arrival_country: string;
  departure_city: string;
  departure_date: string;
  departure_method: string;
  size: string;
  tarif: string;
  status: string;
  insured: boolean;
  is_international: boolean;
  photo_url: string;
}

interface PendingMission {
  id: string;
  ref_number: string;
  product_name: string;
  country: string;
  city: string;
  prix_max: string;
  timing: string;
  status: string;
  photo_url: string;
  poids: string;
  dimension: string;
  is_unlisted: boolean;
  category_path: string[];
  unlisted_description: string;
  created_at: string;
}

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
  catch { return d; }
};

const BrowseMissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("shipments");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "date_asc" | "price_asc" | "price_desc" | "voyageurs">("recent");

  const { data: shipments = [], isLoading: loadingShipments, refetch: refetchShipments } = useQuery({
    queryKey: ["browse-pending-shipments"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_pending_shipments");
      return (data || []) as unknown as PendingShipment[];
    },
    staleTime: 30_000,
  });

  const { data: missions = [], isLoading: loadingMissions, refetch: refetchMissions } = useQuery({
    queryKey: ["browse-pending-missions"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_pending_needit_missions");
      return (data || []) as unknown as PendingMission[];
    },
    staleTime: 30_000,
  });

  // Fetch voyageur counts per unique destination for sorting
  const destinations = useMemo(() => {
    const keys = new Set<string>();
    shipments.forEach(s => keys.add(`${s.arrival_country}||${s.arrival_city || ""}`));
    missions.forEach(m => keys.add(`${m.country}||${m.city || ""}`));
    return Array.from(keys).map(k => {
      const [country, city] = k.split("||");
      return { country, city: city || null };
    });
  }, [shipments, missions]);

  const { data: voyageurCounts = {} } = useQuery({
    queryKey: ["voyageur-counts-browse", destinations],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        destinations.map(async ({ country, city }) => {
          const { data } = await supabase.rpc("count_voyageurs_for_destination", {
            _country: country,
            _city: city,
          });
          counts[`${country}||${city || ""}`] = typeof data === "number" ? data : 0;
        })
      );
      return counts;
    },
    enabled: destinations.length > 0,
    staleTime: 60_000,
  });

  const getVoyageurCount = (country: string, city?: string | null) =>
    voyageurCounts[`${country}||${city || ""}`] ?? 0;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchShipments(), refetchMissions()]);
  }, [refetchShipments, refetchMissions]);

  // Extract unique countries for filter chips
  const shipmentCountries = useMemo(() => {
    const set = new Set(shipments.map(s => s.arrival_country).filter(Boolean));
    return Array.from(set).sort();
  }, [shipments]);

  const missionCountries = useMemo(() => {
    const set = new Set(missions.map(m => m.country).filter(Boolean));
    return Array.from(set).sort();
  }, [missions]);

  const allCountries = useMemo(() => {
    const set = new Set([...shipmentCountries, ...missionCountries]);
    return Array.from(set).sort();
  }, [shipmentCountries, missionCountries]);

  const activeFiltersCount = [!!filterCountry, !!filterDateFrom, !!filterDateTo].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCountry("");
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  const parseTarif = (t: string) => {
    const n = parseFloat(t?.replace(/[^0-9.,]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const filteredShipments = useMemo(() => {
    const filtered = shipments.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !s.arrival_city?.toLowerCase().includes(q) &&
          !s.arrival_country?.toLowerCase().includes(q) &&
          !s.departure_city?.toLowerCase().includes(q)
        ) return false;
      }
      if (filterCountry && s.arrival_country?.toLowerCase() !== filterCountry.toLowerCase()) return false;
      if (filterDateFrom && new Date(s.departure_date) < filterDateFrom) return false;
      if (filterDateTo && new Date(s.departure_date) > filterDateTo) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc": return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
        case "price_asc": return parseTarif(a.tarif) - parseTarif(b.tarif);
        case "price_desc": return parseTarif(b.tarif) - parseTarif(a.tarif);
        case "voyageurs": return getVoyageurCount(b.arrival_country, b.arrival_city) - getVoyageurCount(a.arrival_country, a.arrival_city);
        default: return 0;
      }
    });
  }, [shipments, searchQuery, filterCountry, filterDateFrom, filterDateTo, sortBy]);

  const filteredMissions = useMemo(() => {
    const filtered = missions.filter(m => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !m.city?.toLowerCase().includes(q) &&
          !m.country?.toLowerCase().includes(q) &&
          !m.product_name?.toLowerCase().includes(q)
        ) return false;
      }
      if (filterCountry && m.country?.toLowerCase() !== filterCountry.toLowerCase()) return false;
      if (filterDateFrom && new Date(m.created_at) < filterDateFrom) return false;
      if (filterDateTo && new Date(m.created_at) > filterDateTo) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price_asc": return parseTarif(a.prix_max) - parseTarif(b.prix_max);
        case "price_desc": return parseTarif(b.prix_max) - parseTarif(a.prix_max);
        default: return 0;
      }
    });
  }, [missions, searchQuery, filterCountry, filterDateFrom, filterDateTo, sortBy]);

  const handleAcceptShipment = (s: PendingShipment) => {
    hapticMedium();
    navigate(`/new-trip?arrival_country=${encodeURIComponent(s.arrival_country)}&arrival_city=${encodeURIComponent(s.arrival_city)}&accept_shipment=${s.id}`);
  };

  const handleAcceptMission = (m: PendingMission) => {
    hapticMedium();
    navigate(`/new-trip?arrival_country=${encodeURIComponent(m.country)}&arrival_city=${encodeURIComponent(m.city || "")}&accept_mission=${m.id}`);
  };

  const loading = loadingShipments || loadingMissions;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
        <PageTransition>
          <main className="px-5 pt-10">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => navigate(-1)} className="text-muted-foreground">
                <ArrowLeft size={24} />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">Missions disponibles</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Acceptez une demande et créez votre trajet</p>
              </div>
            </div>

            {/* Search + Filter toggle */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Ville, pays ou produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-muted-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  showFilters ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <SlidersHorizontal size={18} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Filtres avancés</p>
                  {activeFiltersCount > 0 && (
                    <button onClick={resetFilters} className="text-xs text-primary font-medium">
                      Réinitialiser
                    </button>
                  )}
                </div>

                {/* Country filter */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Globe size={12} /> Pays de destination
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterCountry("")}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        !filterCountry ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Tous
                    </button>
                    {allCountries.map(c => (
                      <button
                        key={c}
                        onClick={() => setFilterCountry(filterCountry === c ? "" : c)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                          filterCountry === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range filter */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar size={12} /> Période
                  </p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-xs gap-1.5", !filterDateFrom && "text-muted-foreground")}>
                          <Calendar size={12} />
                          {filterDateFrom ? format(filterDateFrom, "d MMM", { locale: fr }) : "Du"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={filterDateFrom}
                          onSelect={setFilterDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-xs gap-1.5", !filterDateTo && "text-muted-foreground")}>
                          <Calendar size={12} />
                          {filterDateTo ? format(filterDateTo, "d MMM", { locale: fr }) : "Au"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={filterDateTo}
                          onSelect={setFilterDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Active filter pills */}
            {activeFiltersCount > 0 && !showFilters && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {filterCountry && (
                  <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                    <Globe size={10} /> {filterCountry}
                    <button onClick={() => setFilterCountry("")}><X size={10} /></button>
                  </span>
                )}
                {filterDateFrom && (
                  <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                    Dès {format(filterDateFrom, "d MMM", { locale: fr })}
                    <button onClick={() => setFilterDateFrom(undefined)}><X size={10} /></button>
                  </span>
                )}
                {filterDateTo && (
                  <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                    Jusqu'au {format(filterDateTo, "d MMM", { locale: fr })}
                    <button onClick={() => setFilterDateTo(undefined)}><X size={10} /></button>
                  </span>
                )}
              </div>
            )}

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
              <ArrowUpDown size={13} className="text-muted-foreground shrink-0" />
              {([
                { value: "recent", label: "Récents" },
                { value: "date_asc", label: "Date ↑" },
                { value: "price_asc", label: "Prix ↑" },
                { value: "price_desc", label: "Prix ↓" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                    sortBy === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full bg-muted/70 rounded-xl p-1 mb-4">
                <TabsTrigger value="shipments" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package size={13} className="mr-1" /> Colis ({filteredShipments.length})
                </TabsTrigger>
                <TabsTrigger value="missions" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ShoppingBag size={13} className="mr-1" /> NeedIt ({filteredMissions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shipments" className="mt-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredShipments.length === 0 ? (
                  <EmptyState icon={Package} title="Aucun colis en attente" description="Revenez plus tard ou ajustez vos filtres" />
                ) : (
                  <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                    {filteredShipments.map((s) => (
                      <motion.div key={s.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {s.photo_url && <img src={s.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {s.departure_city || "—"} → {s.arrival_city}
                              </p>
                              <p className="text-xs text-muted-foreground">{s.arrival_country}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-primary">{s.tarif}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(s.departure_date)}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-semibold">{s.size}</span>
                          {s.insured && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold">Assuré</span>}
                          <VoyageurAvailability country={s.arrival_country} city={s.arrival_city} variant="compact" />
                        </div>
                        <Button size="sm" className="w-full gap-2" onClick={() => handleAcceptShipment(s)}>
                          Accepter & Créer mon trajet <ArrowRight size={14} />
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="missions" className="mt-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredMissions.length === 0 ? (
                  <EmptyState icon={ShoppingBag} title="Aucune mission NeedIt" description="Revenez plus tard ou ajustez vos filtres" />
                ) : (
                  <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                    {filteredMissions.map((m) => (
                      <motion.div key={m.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {m.photo_url && <img src={m.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                            <div>
                              <p className="text-sm font-semibold text-foreground">{m.product_name || "Mission NeedIt"}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin size={10} /> {m.city || m.country}
                              </p>
                            </div>
                          </div>
                          {m.prix_max && <span className="text-xs font-bold text-primary">Max {m.prix_max}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                          <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize">{m.timing}</span>
                          {m.poids && <span>{m.poids}</span>}
                          {m.is_unlisted && <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[10px] font-semibold">Hors catalogue</span>}
                          <VoyageurAvailability country={m.country} city={m.city} variant="compact" />
                        </div>
                        {m.unlisted_description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.unlisted_description}</p>
                        )}
                        <Button size="sm" className="w-full gap-2" onClick={() => handleAcceptMission(m)}>
                          Accepter & Créer mon trajet <ArrowRight size={14} />
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </PageTransition>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default BrowseMissions;
