import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Package, Shield, Loader2, Send, Image, CheckCircle, PackageCheck } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition, { staggerItem } from "@/components/PageTransition";
import TrackingTimeline from "@/components/TrackingTimeline";
import BottomNav from "@/components/BottomNav";
import RatingDialog from "@/components/RatingDialog";
import DeliveryProofUpload from "@/components/DeliveryProofUpload";
import PickupProofUpload from "@/components/PickupProofUpload";
import ConfirmationCodeDisplay from "@/components/ConfirmationCodeDisplay";
import ConfirmationCodeEntry from "@/components/ConfirmationCodeEntry";
import StarRating from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localizeCity, localizeCountry } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";

const statusSteps = ["pending", "accepted", "picked_up", "in_transit", "delivered"];

const ShipmentTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");

  const statusLabels: Record<string, string> = {
    pending: t("tracking.pending"),
    accepted: t("tracking.accepted"),
    picked_up: t("tracking.pickedUp"),
    in_transit: t("tracking.inTransit"),
    delivered: t("tracking.delivered"),
    cancelled: t("tracking.cancelled"),
  };

  const [shipment, setShipment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryProof, setDeliveryProof] = useState<any>(null);
  const [pickupProof, setPickupProof] = useState<any>(null);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [voyageurRating, setVoyageurRating] = useState<{ average_score: number; total_ratings: number } | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const loadData = async () => {
      const [shipRes, eventsRes, proofRes, pickupRes] = await Promise.all([
        supabase.from("shipments").select("*").eq("id", id).maybeSingle(),
        supabase.from("tracking_events").select("*").eq("shipment_id", id).order("created_at", { ascending: false }),
        supabase.from("delivery_proofs" as any).select("*").eq("shipment_id", id).maybeSingle(),
        supabase.from("pickup_proofs" as any).select("*").eq("shipment_id", id).maybeSingle(),
      ]);

      if (shipRes.data) {
        setShipment(shipRes.data);
        if (shipRes.data.voyageur_id) {
          const { data: ratingData } = await supabase.rpc("get_user_rating" as any, { _user_id: shipRes.data.voyageur_id });
          if (ratingData?.[0]) setVoyageurRating(ratingData[0]);
        }
      }
      if (eventsRes.data) setEvents(eventsRes.data);
      if (proofRes.data) setDeliveryProof(proofRes.data);
      if (pickupRes.data) setPickupProof(pickupRes.data);
      setLoading(false);
    };
    loadData();

    const checkRating = async () => {
      const { data } = await supabase
        .from("ratings" as any)
        .select("id")
        .eq("shipment_id", id)
        .eq("rater_id", user.id)
        .maybeSingle();
      if (data) setHasRated(true);
    };
    checkRating();

    const channel = supabase
      .channel(`tracking-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tracking_events", filter: `shipment_id=eq.${id}` }, (payload) => {
        setEvents((prev) => [payload.new as any, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shipments", filter: `id=eq.${id}` }, (payload) => {
        setShipment(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const handlePickupConfirmed = () => {
    setPickupProof({ confirmed: true });
    setShipment((prev: any) => ({ ...prev, status: "picked_up" }));
  };

  const handleDeliveryConfirmed = () => {
    // Don't auto-set delivered — the confirmation code flow handles that
    setShipment((prev: any) => ({ ...prev, status: "in_transit" }));
  };

  const handleCodeConfirmed = () => {
    setShipment((prev: any) => ({ ...prev, status: "delivered" }));
    setTimeout(() => setShowRatingDialog(true), 1500);
  };

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
          <p className="text-center text-muted-foreground mt-12">{t("tracking.notFound")}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(shipment.status);
  const isDelivered = shipment.status === "delivered";
  const isDemandeur = shipment.user_id === user?.id;
  const isAssignedVoyageur = shipment.voyageur_id === user?.id;
  const ratedUserId = isDemandeur ? shipment.voyageur_id : shipment.user_id;
  const raterRole = isDemandeur ? "demandeur" : "voyageur";

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        <div className="px-6 pt-12 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{t("tracking.title")}</h1>
              <p className="text-xs text-muted-foreground">COLY-{shipment.id.slice(0, 8).toUpperCase()}</p>
            </div>
            {isDelivered && (
              <span className="text-xs font-bold bg-green-500/15 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle size={10} /> {t("tracking.delivered")}
              </span>
            )}
          </div>

          {/* Status card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-primary-foreground/8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Send size={18} className="text-primary-foreground" />
                <span className="text-sm font-semibold text-primary-foreground/90">
                  {shipment.departure_city ? localizeCity(shipment.departure_city) : "—"} → {localizeCity(shipment.arrival_city)}
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                {statusSteps.map((step, i) => {
                  const isCompleted = i <= currentStepIndex && shipment.status !== "cancelled";
                  const isCurrent = i === currentStepIndex && shipment.status !== "cancelled";
                  return (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div className="flex items-center w-full">
                        {i > 0 && (
                          <div className={`h-0.5 flex-1 ${isCompleted ? "bg-primary-foreground" : "bg-primary-foreground/20"}`} />
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isCompleted ? "bg-primary-foreground border-primary-foreground" : "bg-transparent border-primary-foreground/30"
                        } ${isCurrent ? "ring-2 ring-primary-foreground/40 ring-offset-1 ring-offset-transparent" : ""}`}>
                          {isCompleted ? (
                            <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-primary-foreground/25" />
                          )}
                        </div>
                        {i < statusSteps.length - 1 && (
                          <div className={`h-0.5 flex-1 ${i < currentStepIndex && shipment.status !== "cancelled" ? "bg-primary-foreground" : "bg-primary-foreground/20"}`} />
                        )}
                      </div>
                      <span className={`text-[9px] font-semibold mt-1.5 text-center leading-tight ${isCompleted ? "text-primary-foreground" : "text-primary-foreground/35"}`}>
                        {statusLabels[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Shipment details */}
          <motion.div {...staggerItem} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("tracking.details")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("tracking.destination")}</p>
                  <p className="text-sm font-medium text-foreground">{localizeCity(shipment.arrival_city)}, {localizeCountry(shipment.arrival_country)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("tracking.departure")}</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(shipment.departure_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("tracking.size")}</p>
                  <p className="text-sm font-medium text-foreground">{shipment.size}</p>
                </div>
              </div>
              {shipment.insured && (
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("tracking.insurance")}</p>
                    <p className="text-sm font-medium text-primary">{t("tracking.insured")}</p>
                  </div>
                </div>
              )}
            </div>
            {voyageurRating && voyageurRating.total_ratings > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">{t("tracking.voyageurRating")}</p>
                <StarRating score={Number(voyageurRating.average_score)} total={Number(voyageurRating.total_ratings)} />
              </div>
            )}
          </motion.div>

          {/* Pickup Proof — voyageur sees upload form when accepted and no pickup proof yet */}
          {isAssignedVoyageur && shipment.status === "accepted" && !pickupProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PickupProofUpload
                itemId={shipment.id}
                itemType="shipment"
                onProofUploaded={handlePickupConfirmed}
              />
            </motion.div>
          )}

          {/* Pickup Proof — show when exists */}
          {pickupProof?.photo_url && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-[#0D84FF]/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <PackageCheck size={14} className="text-[#0D84FF]" />
                <h3 className="text-sm font-bold text-foreground">Preuve de récupération</h3>
              </div>
              <img src={pickupProof.photo_url} alt="Preuve récupération" className="w-full rounded-xl object-cover max-h-48" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {pickupProof.created_at && <span>📅 {new Date(pickupProof.created_at).toLocaleString("fr-FR")}</span>}
                {pickupProof.latitude && pickupProof.longitude && (
                  <span>📍 {Number(pickupProof.latitude).toFixed(4)}, {Number(pickupProof.longitude).toFixed(4)}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Delivery Proof — voyageur sees upload form when in_transit */}
          {isAssignedVoyageur && shipment.status === "in_transit" && !deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <DeliveryProofUpload
                shipmentId={shipment.id}
                onProofUploaded={(url) => setDeliveryProof({ photo_url: url })}
                onDeliveryConfirmed={handleDeliveryConfirmed}
              />
            </motion.div>
          )}

          {/* Confirmation Code — demandeur sees when in_transit (after delivery proof uploaded) */}
          {isDemandeur && shipment.status === "in_transit" && deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ConfirmationCodeDisplay itemId={shipment.id} itemType="shipment" />
            </motion.div>
          )}

          {/* Confirmation Code Entry — voyageur enters code to finalize */}
          {isAssignedVoyageur && shipment.status === "in_transit" && deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ConfirmationCodeEntry
                itemId={shipment.id}
                itemType="shipment"
                onConfirmed={handleCodeConfirmed}
              />
            </motion.div>
          )}

          {/* Delivery Proof — show photo when delivered */}
          {isDelivered && deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-green-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Image size={14} className="text-green-600" />
                <h3 className="text-sm font-bold text-foreground">{t("tracking.deliveryProof")}</h3>
              </div>
              <img src={deliveryProof.photo_url} alt={t("tracking.deliveryProof")} className="w-full rounded-xl object-cover max-h-48" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {deliveryProof.created_at && (
                  <span>📅 {new Date(deliveryProof.created_at).toLocaleString("fr-FR")}</span>
                )}
                {deliveryProof.latitude && deliveryProof.longitude && (
                  <span>📍 {Number(deliveryProof.latitude).toFixed(4)}, {Number(deliveryProof.longitude).toFixed(4)}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Rating CTA */}
          {isDelivered && !hasRated && ratedUserId && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("tracking.rateDelivery")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("tracking.rateHelp")}</p>
              </div>
              <button
                onClick={() => setShowRatingDialog(true)}
                className="shrink-0 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                ⭐ {t("tracking.rate")}
              </button>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("tracking.timeline")}</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("tracking.noEvents")}</p>
            ) : (
              <TrackingTimeline events={events} />
            )}
          </motion.div>
        </div>
      </PageTransition>

      {showRatingDialog && ratedUserId && (
        <RatingDialog
          open={showRatingDialog}
          onClose={() => { setShowRatingDialog(false); setHasRated(true); }}
          shipmentId={shipment.id}
          ratedUserId={ratedUserId}
          raterRole={raterRole as "demandeur" | "voyageur"}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default ShipmentTracking;
