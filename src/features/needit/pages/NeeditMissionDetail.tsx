import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Package, Clock, Pencil, X, Check, Loader2, AlertTriangle, Scale, Maximize2, DollarSign, Bell, Info, ShieldCheck, PackageCheck, Image, CheckCircle, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import LiveLocationSharing from "@/components/LiveLocationSharing";
import PickupProofUpload from "@/components/PickupProofUpload";
import DeliveryProofUpload from "@/components/DeliveryProofUpload";
import ConfirmationCodeDisplay from "@/components/ConfirmationCodeDisplay";
import ConfirmationCodeEntry from "@/components/ConfirmationCodeEntry";
import RatingDialog from "@/components/RatingDialog";
import StarRating from "@/components/StarRating";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizeCountry } from "@/lib/geoLocalization";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const missionSteps = ["pending", "accepted", "picked_up", "in_transit", "completed"];

const NeeditMissionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [pickupProof, setPickupProof] = useState<any>(null);
  const [deliveryProof, setDeliveryProof] = useState<any>(null);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [voyageurRating, setVoyageurRating] = useState<{ average_score: number; total_ratings: number } | null>(null);

  // Editable fields
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [timing, setTiming] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [autoAccept, setAutoAccept] = useState(false);

  const loadMission = useCallback(async () => {
    if (!id) return;
    const [missionRes, pickupRes, deliveryRes] = await Promise.all([
      supabase.from("needit_missions").select("*").eq("id", id).maybeSingle(),
      supabase.from("pickup_proofs" as any).select("*").eq("shipment_id", id).maybeSingle(),
      supabase.from("delivery_proofs" as any).select("*").eq("shipment_id", id).maybeSingle(),
    ]);

    if (missionRes.data) {
      const data = missionRes.data;
      setMission(data);
      setCountry(data.country || "");
      setCity(data.city || "");
      setTiming(data.timing || "asap");
      setPrixMax(data.prix_max || "");
      setAutoAccept((data as any).auto_accept ?? false);

      if (data.voyageur_id) {
        const { data: ratingData } = await supabase.rpc("get_user_rating" as any, { _user_id: data.voyageur_id });
        if (ratingData?.[0]) setVoyageurRating(ratingData[0]);
      }
    }
    if (pickupRes.data) setPickupProof(pickupRes.data);
    if (deliveryRes.data) setDeliveryProof(deliveryRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadMission(); }, [loadMission]);

  // Check rating
  useEffect(() => {
    if (!id || !user) return;
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
  }, [id, user]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`needit-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "needit_missions", filter: `id=eq.${id}` }, (payload) => {
        setMission(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const isOwner = mission && mission.user_id === user?.id;
  const isVoyageur = mission && mission.voyageur_id === user?.id;
  const isAccepted = mission && mission.voyageur_id != null;
  const canEdit = isOwner && !isAccepted && mission.status !== "cancelled" && mission.status !== "completed";

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("needit_missions").update({
      country,
      city: city || null,
      timing,
      prix_max: prixMax || null,
      auto_accept: autoAccept,
    } as any).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.saved"));
      setEditing(false);
      loadMission();
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("needit_missions").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      setSaving(false);
      toast.error(t("common.error"));
      return;
    }
    // Notify voyageur if mission was accepted
    if (mission?.voyageur_id) {
      await supabase.from("notifications").insert({
        user_id: mission.voyageur_id,
        title: "Mission annulée ❌",
        message: `La mission "${mission.product_name || "NeedIt"}" a été annulée par le demandeur. Le budget sera remboursé si déjà payé.`,
        type: "mission_cancelled:" + id,
      });
    }
    setSaving(false);
    toast.success(t("dashboard.cancelledSuccess"));
    navigate(-1);
  };

  const handlePickupConfirmed = () => {
    setPickupProof({ confirmed: true });
    setMission((prev: any) => ({ ...prev, status: "picked_up" }));
  };

  const handleDeliveryConfirmed = () => {
    setMission((prev: any) => ({ ...prev, status: "in_transit" }));
  };

  const handleCodeConfirmed = () => {
    setMission((prev: any) => ({ ...prev, status: "completed" }));
    setTimeout(() => setShowRatingDialog(true), 1500);
  };

  const handleTransit = async () => {
    if (!id) return;
    await supabase.from("needit_missions").update({ status: "in_transit" } as any).eq("id", id);
    setMission((prev: any) => ({ ...prev, status: "in_transit" }));
    toast.success("Statut mis à jour : en transit");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <button onClick={() => navigate(-1)} className="text-primary font-semibold">{t("common.back")}</button>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: t("missions.pending"), color: "bg-[#0D84FF]" },
    accepted: { label: t("missions.inProgress"), color: "bg-[#30D158]" },
    picked_up: { label: "Récupéré", color: "bg-secondary" },
    in_transit: { label: "En transit", color: "bg-accent" },
    completed: { label: t("missions.completed"), color: "bg-green-600" },
    cancelled: { label: t("dashboard.cancelled"), color: "bg-destructive" },
  };
  const st = statusMap[mission.status] || statusMap.pending;

  const statusLabels: Record<string, string> = {
    pending: t("missions.pending"),
    accepted: t("missions.inProgress"),
    picked_up: "Récupéré",
    in_transit: "En transit",
    completed: "Livré",
  };

  const currentStepIndex = missionSteps.indexOf(mission.status);
  const isCompleted = mission.status === "completed";
  const ratedUserId = isOwner ? mission.voyageur_id : mission.user_id;
  const raterRole = isOwner ? "demandeur" : "voyageur";

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        {/* Header */}
        <div className="px-6 pt-12 pb-6 rounded-b-3xl" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-primary-foreground">{t("dashboard.missionDetail")}</h1>
            <div className="w-6" />
          </div>
        </div>

        <div className="px-6 pt-6 space-y-4">
          {/* Status + ref */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${st.color}`}>
              {st.label}
            </span>
            <span className="text-xs text-muted-foreground">
              REF: NEED-{mission.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Tracking progress bar — visible once accepted */}
          {isAccepted && mission.status !== "cancelled" && (
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
                    {mission.product_name || "Mission NeedIt"} — {localizeCountry(mission.country, language)}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  {missionSteps.map((step, i) => {
                    const isStepCompleted = i <= currentStepIndex && mission.status !== "cancelled";
                    const isCurrent = i === currentStepIndex && mission.status !== "cancelled";
                    return (
                      <div key={step} className="flex flex-col items-center flex-1">
                        <div className="flex items-center w-full">
                          {i > 0 && (
                            <div className={`h-0.5 flex-1 ${isStepCompleted ? "bg-primary-foreground" : "bg-primary-foreground/20"}`} />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                            isStepCompleted ? "bg-primary-foreground border-primary-foreground" : "bg-transparent border-primary-foreground/30"
                          } ${isCurrent ? "ring-2 ring-primary-foreground/40 ring-offset-1 ring-offset-transparent" : ""}`}>
                            {isStepCompleted ? (
                              <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-primary-foreground/25" />
                            )}
                          </div>
                          {i < missionSteps.length - 1 && (
                            <div className={`h-0.5 flex-1 ${i < currentStepIndex && mission.status !== "cancelled" ? "bg-primary-foreground" : "bg-primary-foreground/20"}`} />
                          )}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1.5 text-center leading-tight ${isStepCompleted ? "text-primary-foreground" : "text-primary-foreground/35"}`}>
                          {statusLabels[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Product photo — full width */}
          <div className="bg-card border border-border rounded-2xl p-4">
            {mission.photo_url ? (
              <img src={mission.photo_url} alt="Produit" className="w-full h-auto rounded-xl object-cover" style={{ borderRadius: 12 }} />
            ) : (
              <div className="w-full py-12 rounded-xl bg-muted flex flex-col items-center justify-center gap-2" style={{ borderRadius: 12 }}>
                <Image size={32} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aucune photo fournie</span>
              </div>
            )}
          </div>

          {/* Product card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="min-w-0">
              <p className="font-bold text-foreground text-lg truncate">
                {mission.product_name || mission.category_path?.[mission.category_path.length - 1] || t("missions.unlistedProduct")}
              </p>
              {mission.category_path?.length > 0 && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{mission.category_path.join(" → ")}</p>
              )}
            </div>

            {/* Warning if accepted */}
            {isOwner && isAccepted && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{t("dashboard.cannotEditAccepted")}</span>
              </div>
            )}

            {/* Info or edit form */}
            {!editing ? (
              <div className="space-y-3">
                <InfoRow icon={<MapPin size={14} />} label={t("sendColy.country")} value={`${localizeCountry(mission.country, language)}${mission.city ? `, ${mission.city}` : ""}`} />
                <InfoRow icon={<Clock size={14} />} label={t("missions.timing")} value={mission.timing === "asap" ? t("missions.asap") : t("missions.scheduled")} />
                {mission.poids && <InfoRow icon={<Scale size={14} />} label={t("sendColy.weight")} value={mission.poids} />}
                {mission.dimension && <InfoRow icon={<Maximize2 size={14} />} label={t("sendColy.dimension")} value={mission.dimension} />}
                {mission.prix_max && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground"><DollarSign size={14} /></span>
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{t("needit.budgetMax")}</span>
                    <span className="text-sm font-bold" style={{ color: "#30D158" }}>{mission.prix_max}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info size={12} className="text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-[250px] text-xs">{t("needit.budgetTooltip")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground"><ShieldCheck size={14} /></span>
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{t("needit.autoAccept")}</span>
                  <span className={`text-sm font-bold ${(mission as any).auto_accept ? "text-[#0D84FF]" : "text-muted-foreground"}`}>
                    {(mission as any).auto_accept ? t("needit.autoAcceptYes") : t("needit.autoAcceptNo")}
                  </span>
                </div>
                {mission.ean_code && <InfoRow icon={<Package size={14} />} label="EAN" value={mission.ean_code} />}
                {voyageurRating && voyageurRating.total_ratings > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Note du voyageur</p>
                    <StarRating score={Number(voyageurRating.average_score)} total={Number(voyageurRating.total_ratings)} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("sendColy.country")}</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("sendColy.city")}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("missions.timing")}</Label>
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="asap">{t("missions.asap")}</option>
                    <option value="scheduled">{t("missions.scheduled")}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("needit.budgetLabel")} <span className="text-destructive">*</span></Label>
                  <Input value={prixMax} onChange={(e) => setPrixMax(e.target.value)} placeholder="50€" />
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                  <div className="flex-1 mr-3">
                    <p className="text-xs font-semibold text-foreground">{t("needit.autoAcceptLabel")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("needit.autoAcceptHint")}</p>
                  </div>
                  <Switch checked={autoAccept} onCheckedChange={setAutoAccept} className="data-[state=checked]:bg-[#0D84FF]" />
                </div>
              </div>
            )}
          </div>

          {/* Pickup Proof — voyageur uploads when accepted */}
          {isVoyageur && mission.status === "accepted" && !pickupProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PickupProofUpload
                itemId={mission.id}
                itemType="needit_mission"
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

          {/* Voyageur: mark as in transit after pickup */}
          {isVoyageur && mission.status === "picked_up" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={handleTransit}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
              >
                <Send size={16} /> Passer en transit
              </button>
            </motion.div>
          )}

          {/* Delivery Proof — voyageur uploads when in_transit */}
          {isVoyageur && mission.status === "in_transit" && !deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <DeliveryProofUpload
                shipmentId={mission.id}
                onProofUploaded={(url) => setDeliveryProof({ photo_url: url })}
                onDeliveryConfirmed={handleDeliveryConfirmed}
              />
            </motion.div>
          )}

          {/* Confirmation Code — demandeur sees when in_transit and delivery proof exists */}
          {isOwner && mission.status === "in_transit" && deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ConfirmationCodeDisplay itemId={mission.id} itemType="needit_mission" />
            </motion.div>
          )}

          {/* Confirmation Code Entry — voyageur enters code to finalize */}
          {isVoyageur && mission.status === "in_transit" && deliveryProof && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ConfirmationCodeEntry
                itemId={mission.id}
                itemType="needit_mission"
                onConfirmed={handleCodeConfirmed}
              />
            </motion.div>
          )}

          {/* Delivery Proof — show photo when completed */}
          {isCompleted && deliveryProof?.photo_url && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-green-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Image size={14} className="text-green-600" />
                <h3 className="text-sm font-bold text-foreground">Preuve de livraison</h3>
              </div>
              <img src={deliveryProof.photo_url} alt="Preuve livraison" className="w-full rounded-xl object-cover max-h-48" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {deliveryProof.created_at && <span>📅 {new Date(deliveryProof.created_at).toLocaleString("fr-FR")}</span>}
                {deliveryProof.latitude && deliveryProof.longitude && (
                  <span>📍 {Number(deliveryProof.latitude).toFixed(4)}, {Number(deliveryProof.longitude).toFixed(4)}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Rating CTA */}
          {isCompleted && !hasRated && ratedUserId && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Notez cette mission</p>
                <p className="text-xs text-muted-foreground mt-0.5">Votre avis aide la communauté</p>
              </div>
              <button
                onClick={() => setShowRatingDialog(true)}
                className="shrink-0 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                ⭐ Noter
              </button>
            </motion.div>
          )}

          {/* Live location sharing */}
          {mission.voyageur_id && (mission.status === "accepted" || mission.status === "picked_up" || mission.status === "in_transit") && (
            <LiveLocationSharing
              itemId={mission.id}
              voyageurId={mission.voyageur_id}
              isVoyageur={user?.id === mission.voyageur_id}
            />
          )}

          {/* Reminder button */}
          {mission.status !== "cancelled" && mission.status !== "completed" && (
            <button
              onClick={() => setShowReminder(true)}
              className="w-full py-3 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Bell size={14} /> {t("reminder.btnLabel")}
            </button>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="space-y-3">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm"
                >
                  <Pencil size={16} /> {t("common.edit")}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditing(false); loadMission(); }}
                    className="flex-1 py-3.5 rounded-2xl border border-border text-muted-foreground font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <X size={16} /> {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t("common.save")}
                  </button>
                </div>
              )}

              {!editing && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive font-semibold text-sm"
                >
                  {t("dashboard.cancelMission")}
                </button>
              )}
            </div>
          )}

          {/* Cancel button for owner when mission is accepted (voyageur assigned) */}
          {isOwner && isAccepted && mission.status !== "cancelled" && mission.status !== "completed" && !canEdit && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => setShowCancel(true)}
                className="w-full py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2"
              >
                <X size={16} /> Annuler la mission
              </button>
            </motion.div>
          )}
        </div>
      </PageTransition>
      <BottomNav />

      {/* Cancel dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{isAccepted ? "Annuler la mission" : t("dashboard.cancelMission")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAccepted
                ? "Voulez-vous vraiment annuler ? Le voyageur sera notifié et le budget remboursé."
                : t("dashboard.cancelMissionDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rating dialog */}
      {showRatingDialog && ratedUserId && (
        <RatingDialog
          open={showRatingDialog}
          onClose={() => { setShowRatingDialog(false); setHasRated(true); }}
          shipmentId={mission.id}
          ratedUserId={ratedUserId}
          raterRole={raterRole as "demandeur" | "voyageur"}
        />
      )}

      {/* Reminder dialog */}
      {mission && (
        <ReminderDialog
          info={{
            itemType: "needit_mission",
            itemId: mission.id,
            departureCity: mission.city || mission.country,
            arrivalCity: mission.country,
            departureDate: new Date().toISOString().split("T")[0],
          }}
          open={showReminder}
          onOpenChange={setShowReminder}
        />
      )}
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

export default NeeditMissionDetail;
