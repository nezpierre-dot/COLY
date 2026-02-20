import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Package, Shield, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition, { staggerItem } from "@/components/PageTransition";
import TrackingTimeline from "@/components/TrackingTimeline";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusSteps = ["pending", "accepted", "picked_up", "in_transit", "delivered"];

const statusLabels: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  picked_up: "Récupéré",
  in_transit: "En transit",
  delivered: "Livré",
  cancelled: "Annulé",
};

const ShipmentTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [shipment, setShipment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const loadData = async () => {
      const [shipRes, eventsRes] = await Promise.all([
        supabase.from("shipments").select("*").eq("id", id).maybeSingle(),
        supabase.from("tracking_events").select("*").eq("shipment_id", id).order("created_at", { ascending: false }),
      ]);
      if (shipRes.data) setShipment(shipRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      setLoading(false);
    };
    loadData();

    // Realtime for tracking events
    const channel = supabase
      .channel(`tracking-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tracking_events", filter: `shipment_id=eq.${id}` }, (payload) => {
        setEvents((prev) => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-6 pt-12">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={24} />
          </button>
          <p className="text-center text-muted-foreground mt-12">Envoi introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(shipment.status);
  const progressPercent = shipment.status === "cancelled" ? 0 : Math.max(0, ((currentStepIndex) / (statusSteps.length - 1)) * 100);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        <div className="px-6 pt-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Suivi du colis</h1>
              <p className="text-xs text-muted-foreground">COLY-{shipment.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Status card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 mb-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-primary-foreground/8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Send size={18} className="text-primary-foreground" />
                <span className="text-sm font-semibold text-primary-foreground/90">
                  {shipment.departure_city || "—"} → {shipment.arrival_city}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-primary-foreground/20 rounded-full mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="absolute inset-y-0 left-0 bg-primary-foreground rounded-full"
                />
              </div>

              {/* Step indicators */}
              <div className="flex justify-between">
                {statusSteps.map((step, i) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mb-1 ${
                      i <= currentStepIndex ? "bg-primary-foreground" : "bg-primary-foreground/30"
                    }`} />
                    <span className={`text-[8px] font-medium ${
                      i <= currentStepIndex ? "text-primary-foreground" : "text-primary-foreground/40"
                    }`}>
                      {statusLabels[step]?.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Shipment details */}
          <motion.div {...staggerItem} className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Détails</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium text-foreground">{shipment.arrival_city}, {shipment.arrival_country}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Départ</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(shipment.departure_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Taille</p>
                  <p className="text-sm font-medium text-foreground">{shipment.size}</p>
                </div>
              </div>
              {shipment.insured && (
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Assurance</p>
                    <p className="text-sm font-medium text-primary">Assuré</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Historique de suivi</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun événement de suivi</p>
            ) : (
              <TrackingTimeline events={events} />
            )}
          </motion.div>
        </div>
      </PageTransition>
      <BottomNav />
    </div>
  );
};

export default ShipmentTracking;
