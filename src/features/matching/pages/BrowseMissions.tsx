import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Package, ShoppingBag, Calendar, ArrowRight, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { hapticMedium } from "@/lib/haptics";

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

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchShipments(), refetchMissions()]);
  }, [refetchShipments, refetchMissions]);

  const filteredShipments = useMemo(() => {
    if (!searchQuery) return shipments;
    const q = searchQuery.toLowerCase();
    return shipments.filter(s =>
      s.arrival_city?.toLowerCase().includes(q) ||
      s.arrival_country?.toLowerCase().includes(q) ||
      s.departure_city?.toLowerCase().includes(q)
    );
  }, [shipments, searchQuery]);

  const filteredMissions = useMemo(() => {
    if (!searchQuery) return missions;
    const q = searchQuery.toLowerCase();
    return missions.filter(m =>
      m.city?.toLowerCase().includes(q) ||
      m.country?.toLowerCase().includes(q) ||
      m.product_name?.toLowerCase().includes(q)
    );
  }, [missions, searchQuery]);

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
              <div>
                <h1 className="text-2xl font-bold text-foreground">Missions disponibles</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Acceptez une demande et créez votre trajet</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 mb-4">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Rechercher par ville, pays ou produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-muted-foreground">
                  <X size={14} />
                </button>
              )}
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
                  <EmptyState icon={Package} title="Aucun colis en attente" message="Revenez plus tard pour de nouvelles demandes" />
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(s.departure_date)}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-semibold">{s.size}</span>
                          {s.insured && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold">Assuré</span>}
                        </div>
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => handleAcceptShipment(s)}
                        >
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
                  <EmptyState icon={ShoppingBag} title="Aucune mission NeedIt" message="Revenez plus tard pour de nouvelles missions" />
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize">{m.timing}</span>
                          {m.poids && <span>{m.poids}</span>}
                          {m.is_unlisted && <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[10px] font-semibold">Hors catalogue</span>}
                        </div>
                        {m.unlisted_description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.unlisted_description}</p>
                        )}
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => handleAcceptMission(m)}
                        >
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
