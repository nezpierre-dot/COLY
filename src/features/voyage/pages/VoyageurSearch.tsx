import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Calendar, Plane, Train, Car, Bus, Ship, Bike, Rocket, SlidersHorizontal, X, ShoppingCart, Package, Home, Star, Thermometer, PawPrint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import StarRating from "@/components/StarRating";
import PullToRefresh from "@/components/PullToRefresh";
import { Slider } from "@/components/ui/slider";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { localizeCity, localizeCountry } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";

interface Voyage {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  departure_time: string | null;
  transport_method: string;
  accept_needit: boolean;
  can_pickup: boolean;
  deliver_to_address: boolean;
  can_move: boolean;
  status: string;
  user_id: string;
  max_weight_kg: number | null;
  avg_rating?: number | null;
  total_ratings?: number;
}

const transportIcon = (method: string) => {
  const first = method?.split(",")[0]?.trim().toLowerCase();
  switch (first) {
    case "avion": return <Plane size={16} className="text-primary" />;
    case "train": return <Train size={16} className="text-secondary" />;
    case "voiture": return <Car size={16} className="text-accent" />;
    case "bus": return <Bus size={16} className="text-muted-foreground" />;
    case "bateau": return <Ship size={16} className="text-primary" />;
    case "velo": return <Bike size={16} className="text-secondary" />;
    default: return <Rocket size={16} className="text-muted-foreground" />;
  }
};

const transportFilterIcon = (method: string) => {
  switch (method?.toLowerCase()) {
    case "avion": return <Plane size={14} className="inline" />;
    case "train": return <Train size={14} className="inline" />;
    case "voiture": return <Car size={14} className="inline" />;
    case "bus": return <Bus size={14} className="inline" />;
    case "bateau": return <Ship size={14} className="inline" />;
    case "velo": return <Bike size={14} className="inline" />;
    default: return <Rocket size={14} className="inline" />;
  }
};

const VoyageurSearch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [destQuery, setDestQuery] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterNeedit, setFilterNeedit] = useState(false);
  const [filterPickup, setFilterPickup] = useState(false);
  const [filterDeliver, setFilterDeliver] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [filterMinRating, setFilterMinRating] = useState(0);

  // TanStack Query for data fetching
  const { data: voyages = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["voyageur-search"],
    queryFn: async () => {
      const { data } = await supabase
        .from("voyages")
        .select("*")
        .eq("status", "active")
        .order("departure_date", { ascending: true });

      if (!data) return [];

      const enriched = await Promise.all(
        data.map(async (v) => {
          const { data: ratingData } = await supabase.rpc("get_user_rating", { _user_id: v.user_id });
          return {
            ...v,
            avg_rating: ratingData?.[0]?.average_score ?? null,
            total_ratings: Number(ratingData?.[0]?.total_ratings ?? 0),
          };
        })
      );
      return enriched as Voyage[];
    },
    staleTime: 30_000,
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    return voyages.filter((v) => {
      if (destQuery) {
        const q = destQuery.toLowerCase();
        if (
          !v.arrival_city?.toLowerCase().includes(q) &&
          !v.arrival_country?.toLowerCase().includes(q)
        ) return false;
      }
      if (originQuery) {
        const q = originQuery.toLowerCase();
        if (
          !v.departure_city?.toLowerCase().includes(q) &&
          !v.departure_country?.toLowerCase().includes(q)
        ) return false;
      }
      if (filterNeedit && !v.accept_needit) return false;
      if (filterPickup && !v.can_pickup) return false;
      if (filterDeliver && !v.deliver_to_address) return false;
      if (filterMethod) {
        const methods = v.transport_method?.toLowerCase().split(",").map((m: string) => m.trim()) || [];
        if (!methods.includes(filterMethod)) return false;
      }
      // Rating filter
      if (filterMinRating > 0) {
        if (!v.avg_rating || v.avg_rating < filterMinRating) return false;
      }
      return true;
    });
  }, [voyages, destQuery, originQuery, filterNeedit, filterPickup, filterDeliver, filterMethod, filterMinRating]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
    } catch { return dateStr; }
  };

  const activeFiltersCount = [filterNeedit, filterPickup, filterDeliver, !!filterMethod, filterMinRating > 0].filter(Boolean).length;

  const resetFilters = () => {
    setFilterNeedit(false);
    setFilterPickup(false);
    setFilterDeliver(false);
    setFilterMethod("");
    setFilterMinRating(0);
  };

  const ratingLabels: Record<number, string> = {
    0: "Tous",
    3: "≥ 3.0",
    3.5: "≥ 3.5",
    4: "≥ 4.0",
    4.5: "≥ 4.5",
    4.8: "≥ 4.8 ⭐",
  };

  return (
    <div className="page-shell">
      <PullToRefresh onRefresh={handleRefresh}>
      <PageTransition>
        <header className="page-header-soft">
          <div className="page-content">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate(-1)} className="text-muted-foreground inline-flex items-center justify-center w-10 h-10 rounded-full bg-card/80 backdrop-blur shadow-soft hover:bg-card transition" aria-label="Retour">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{t("search.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2 pl-13">{t("search.subtitle")}</p>
          </div>
        </header>

        <main className="page-content pt-5" id="main-content" role="main" aria-label="Recherche de voyageurs">

          {/* Search fields */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
              <MapPin size={16} className="text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder={t("search.departPlaceholder")}
                value={originQuery}
                onChange={(e) => setOriginQuery(e.target.value)}
                aria-label="Ville ou pays de départ"
              />
              {originQuery && (
                <button onClick={() => setOriginQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
              <Search size={16} className="text-primary shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder={t("search.destPlaceholder")}
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                aria-label="Ville ou pays de destination"
                autoFocus
              />
              {destQuery && (
                <button onClick={() => setDestQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? t("common.loading") : `${filtered.length} ${t("search.results")}`}
            </p>
            <button
              onClick={() => { hapticLight(); setFilterOpen(!filterOpen); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                filterOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <SlidersHorizontal size={13} />
              {t("common.filters")}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
                  {/* Transport method */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("search.transport")}</p>
                    <div className="flex flex-wrap gap-2">
                      {["", "avion", "train", "voiture", "bus", "bateau", "velo"].map((m) => (
                        <button
                          key={m}
                          onClick={() => { hapticLight(); setFilterMethod(m); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterMethod === m
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {m ? <span className="flex items-center gap-1">{transportFilterIcon(m)} {m.charAt(0).toUpperCase() + m.slice(1)}</span> : t("common.all")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating filter */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      <Star size={10} className="inline mr-1" />
                      Note minimum
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 3, 3.5, 4, 4.5, 4.8].map((r) => (
                        <button
                          key={r}
                          onClick={() => { hapticLight(); setFilterMinRating(r); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            filterMinRating === r
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {ratingLabels[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("search.options")}</p>
                    <div className="space-y-2">
                      {[
                        { label: t("search.acceptsNeedit"), val: filterNeedit, set: setFilterNeedit, icon: <ShoppingCart size={12} /> },
                        { label: t("search.canPickup"), val: filterPickup, set: setFilterPickup, icon: <Package size={12} /> },
                        { label: t("search.deliverAddress"), val: filterDeliver, set: setFilterDeliver, icon: <Home size={12} /> },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => { hapticLight(); opt.set(!opt.val); }}
                          className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${
                            opt.val
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <span className={opt.val ? "text-primary" : "text-muted-foreground"}>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="text-xs text-destructive hover:underline"
                    >
                      {t("common.resetFilters")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              nido="search"
              title={t("search.noResults")}
              description={destQuery || originQuery ? t("search.noResultsDesc") : t("search.noActive")}
            />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {filtered.map((v) => (
                <motion.div
                  key={v.id}
                  variants={staggerItem}
                  className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow"
                >
                  {/* Route */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {transportIcon(v.transport_method)}
                        <h3 className="font-bold text-foreground text-sm truncate">
                          {localizeCity(v.departure_city)} → {localizeCity(v.arrival_city)}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {localizeCountry(v.departure_country)} → {localizeCountry(v.arrival_country)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Calendar size={11} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{formatDate(v.departure_date)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  {(v.total_ratings ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <StarRating score={v.avg_rating ?? 0} total={v.total_ratings ?? 0} size={14} />
                    </div>
                  )}

                  {/* Options badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {v.accept_needit && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary flex items-center gap-1">
                        <ShoppingCart size={10} /> NeedIt
                      </span>
                    )}
                    {v.can_pickup && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                        <Package size={10} /> Récupération
                      </span>
                    )}
                    {v.deliver_to_address && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent flex items-center gap-1">
                        <Home size={10} /> Livraison adresse
                      </span>
                    )}
                    {v.max_weight_kg && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Max {v.max_weight_kg}kg
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => { hapticMedium(); navigate("/send-coly"); }}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.97] transition-all duration-150"
                  >
                    {t("search.sendWith")}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </PageTransition>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default VoyageurSearch;
