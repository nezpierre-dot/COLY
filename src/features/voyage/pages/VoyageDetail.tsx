import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Plane, Train, Car, Bus, Ship, Bike, Clock, Pencil, X, Check, Loader2, AlertTriangle, Package, Users, Bell, Lock, ShoppingBag, Camera, Weight, User, ChevronRight, Truck, Download, Euro } from "lucide-react";
import AcceptedItemCard from "@/components/AcceptedItemCard";
import PostMatchActions from "@/components/PostMatchActions";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import ConfettiCelebration from "@/components/ConfettiCelebration";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { localizeCity, localizeCountry } from "@/lib/geoLocalization";
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

const transportIcon = (method: string) => {
  const first = method?.split(",")[0]?.trim().toLowerCase();
  switch (first) {
    case "avion": return <Plane size={18} className="text-primary" />;
    case "train": return <Train size={18} className="text-secondary" />;
    case "voiture": return <Car size={18} className="text-accent" />;
    case "bus": return <Bus size={18} className="text-muted-foreground" />;
    case "bateau": return <Ship size={18} className="text-primary" />;
    case "velo": return <Bike size={18} className="text-secondary" />;
    default: return <Package size={18} className="text-muted-foreground" />;
  }
};

const VoyageDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const [voyage, setVoyage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Editable fields
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureAddress, setDepartureAddress] = useState("");
  const [arrivalAddress, setArrivalAddress] = useState("");
  const [canPickup, setCanPickup] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [deliverToAddress, setDeliverToAddress] = useState(false);
  const [acceptNeedit, setAcceptNeedit] = useState(false);
  const [needitBudget, setNeeditBudget] = useState("");

  // Inline capacity editing
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingVolume, setEditingVolume] = useState(false);
  const [editMaxWeight, setEditMaxWeight] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [editingCutoff, setEditingCutoff] = useState(false);
  const [editCutoffHours, setEditCutoffHours] = useState("");

  const isOwner = voyage && voyage.user_id === user?.id;
  const isActive = voyage && voyage.status === "active";
  const [hasAcceptedShipments, setHasAcceptedShipments] = useState(false);
  const [acceptedMissions, setAcceptedMissions] = useState<any[]>([]);
  const [acceptedColis, setAcceptedColis] = useState<any[]>([]);
  const [capturingMissionId, setCapturingMissionId] = useState<string | null>(null);
  const [capturingType, setCapturingType] = useState<"mission" | "shipment">("mission");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [missionsWithProof, setMissionsWithProof] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [demandeurNames, setDemandeurNames] = useState<Record<string, string>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [batchTransiting, setBatchTransiting] = useState(false);

  // Check if within 24h of departure
  const isWithin24h = useCallback(() => {
    if (!voyage?.departure_date) return false;
    const depDateStr = voyage.departure_date;
    const depTimeStr = voyage.departure_time || "00:00";
    const depDate = new Date(`${depDateStr}T${depTimeStr}`);
    const now = new Date();
    const diff = depDate.getTime() - now.getTime();
    return diff <= 24 * 60 * 60 * 1000; // 24h or less (or already past)
  }, [voyage]);

  const loadVoyage = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("voyages").select("*").eq("id", id).maybeSingle();
    if (data) {
      setVoyage(data);
      setDepartureDate(data.departure_date || "");
      setDepartureTime(data.departure_time || "");
      setArrivalDate(data.arrival_date || "");
      setArrivalTime(data.arrival_time || "");
      setDepartureAddress(data.departure_address || "");
      setArrivalAddress(data.arrival_address || "");
      setCanPickup(data.can_pickup || false);
      setCanMove(data.can_move || false);
      setDeliverToAddress(data.deliver_to_address || false);
      setAcceptNeedit(data.accept_needit || false);
      setNeeditBudget(data.needit_budget || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadVoyage(); }, [loadVoyage]);

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setPreviewFile(null);
    setTimeout(() => cameraRef.current?.click(), 50);
  };

  const handleConfirmCapture = async () => {
    if (!previewFile || !user || !capturingMissionId) return;
    setUploadingProof(true);

    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const path = `pickup-proofs/${capturingMissionId}/${Date.now()}-${previewFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("shipment-photos").upload(path, previewFile);
      if (uploadErr) throw uploadErr;

      const { data: signed } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 90);
      const photoUrl = signed?.signedUrl ?? "";

      const { error: proofErr } = await supabase.from("pickup_proofs" as any).insert({
        shipment_id: capturingMissionId,
        photo_url: photoUrl,
        latitude: lat,
        longitude: lng,
        uploaded_by: user.id,
      });
      if (proofErr) throw proofErr;

      if (capturingType === "shipment") {
        await supabase.from("shipments").update({ status: "picked_up" } as any).eq("id", capturingMissionId);
        setAcceptedColis(prev => prev.map(s => s.id === capturingMissionId ? { ...s, status: "picked_up" } : s));
      } else {
        await supabase.from("needit_missions").update({ status: "picked_up" } as any).eq("id", capturingMissionId);
        setAcceptedMissions(prev => prev.map(m => m.id === capturingMissionId ? { ...m, status: "picked_up" } : m));
      }

      toast.success("Récupération confirmée ✅");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la confirmation");
    } finally {
      setUploadingProof(false);
      setCapturingMissionId(null);
      setPreviewUrl(null);
      setPreviewFile(null);
    }
  };

  // Check if any shipment has been accepted for this specific voyage route & date
  useEffect(() => {
    if (!voyage || !user) return;
    const checkAccepted = async () => {
      const { data: shipData } = await supabase
        .from("shipments")
        .select("id, departure_city, arrival_city, arrival_country, size, tarif, status, departure_date, user_id")
        .eq("voyageur_id", user.id)
        .in("status", ["accepted", "picked_up", "in_transit", "delivered"])
        .eq("arrival_city", voyage.arrival_city)
        .eq("arrival_country", voyage.arrival_country)
        .eq("departure_date", voyage.departure_date);

      let missionQuery = supabase
        .from("needit_missions")
        .select("id, product_name, status, country, city, prix_max, user_id")
        .eq("voyageur_id", user.id)
        .in("status", ["accepted", "picked_up", "in_transit", "completed"])
        .eq("country", voyage.arrival_country);
      
      // Also filter by city if the voyage has a specific arrival city
      if (voyage.arrival_city) {
        missionQuery = missionQuery.eq("city", voyage.arrival_city);
      }

      const { data: missionData } = await missionQuery;

      setAcceptedColis(shipData || []);
      setAcceptedMissions(missionData || []);
      setHasAcceptedShipments(
        (shipData?.length || 0) > 0 || (missionData?.length || 0) > 0
      );

      // Check which NeedIt missions have proof of purchase in chat
      if (missionData && missionData.length > 0) {
        const proofSet = new Set<string>();
        for (const mission of missionData) {
          // Find conversation for this mission
          const { data: convo } = await supabase
            .from("conversations")
            .select("id")
            .eq("shipment_id", mission.id)
            .eq("voyageur_id", user.id)
            .maybeSingle();

          if (convo) {
            // Check if any message contains __PROOF__: prefix
            const { data: proofMsgs } = await supabase
              .from("messages")
              .select("id")
              .eq("conversation_id", convo.id)
              .like("content", "__PROOF__:%")
              .limit(1);

            if (proofMsgs && proofMsgs.length > 0) {
              proofSet.add(mission.id);
            }
          }
        }
        setMissionsWithProof(proofSet);
      }
      // Fetch demandeur names
      const allUserIds = new Set<string>();
      (shipData || []).forEach((s: any) => { if (s.user_id) allUserIds.add(s.user_id); });
      (missionData || []).forEach((m: any) => { if (m.user_id) allUserIds.add(m.user_id); });
      if (allUserIds.size > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", Array.from(allUserIds));
        if (profilesData) {
          const nameMap: Record<string, string> = {};
          profilesData.forEach((p: any) => { nameMap[p.user_id] = p.full_name || "Utilisateur"; });
          setDemandeurNames(nameMap);
        }
      }
    };
    checkAccepted();
  }, [voyage, user]);

  const locked24h = isWithin24h();
  const canEdit = isOwner && isActive && !hasAcceptedShipments && !locked24h;
  const canEditCapacity = isOwner && isActive;

  const handleSaveCapacity = async (field: "max_weight_kg" | "capacity_volume_liters") => {
    if (!id) return;
    setSavingCapacity(true);
    const value = field === "max_weight_kg" ? parseFloat(editMaxWeight) : parseFloat(editVolume);
    const { error } = await supabase.from("voyages").update({ [field]: isNaN(value) ? null : value }).eq("id", id);
    setSavingCapacity(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.saved"));
      if (field === "max_weight_kg") setEditingWeight(false);
      else setEditingVolume(false);
      loadVoyage();
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("voyages").update({
      departure_date: departureDate,
      departure_time: departureTime || null,
      arrival_date: arrivalDate || null,
      arrival_time: arrivalTime || null,
      departure_address: departureAddress || null,
      arrival_address: arrivalAddress || null,
      can_pickup: canPickup,
      can_move: canMove,
      deliver_to_address: deliverToAddress,
      accept_needit: acceptNeedit,
      needit_budget: acceptNeedit ? (needitBudget || null) : null,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.saved"));
      setEditing(false);
      loadVoyage();
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("voyages").update({ status: "cancelled" }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("dashboard.cancelledSuccess"));
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!voyage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <button onClick={() => navigate("/dashboard")} className="text-primary font-semibold">{t("common.back")}</button>
      </div>
    );
  }

  const statusColor = voyage.status === "active" ? "bg-primary" : voyage.status === "cancelled" ? "bg-destructive" : voyage.status === "completed" ? "bg-success" : "bg-muted";
  const statusLabel = voyage.status === "active" ? t("dashboard.active") : voyage.status === "cancelled" ? t("dashboard.cancelled") : voyage.status === "completed" ? "Terminé" : voyage.status;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageTransition>
        {/* Header */}
        <div className="px-6 pt-12 pb-6 rounded-b-3xl" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}>
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-primary-foreground">{t("dashboard.voyageDetail")}</h1>
            <div className="w-6" />
          </div>
        </div>

        <div className="px-6 pt-6 space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              REF: VOY-{voyage.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Linked items summary */}
          {(acceptedColis.length > 0 || acceptedMissions.length > 0) && (() => {
            const total = acceptedColis.length + acceptedMissions.length;
            const delivered = acceptedColis.filter(s => s.status === "delivered").length + acceptedMissions.filter(m => m.status === "completed").length;
            const progressPct = total > 0 ? Math.round((delivered / total) * 100) : 0;

            const statusFlow = ["accepted", "picked_up", "in_transit", "delivered"];
            const missionStatusFlow = ["accepted", "picked_up", "in_transit", "completed"];

            const getNextStatus = (current: string, isMission: boolean) => {
              const flow = isMission ? missionStatusFlow : statusFlow;
              const idx = flow.indexOf(current);
              return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
            };

            const nextActionLabel = (next: string | null) => {
              switch (next) {
                case "picked_up": return { label: "Récupérer", icon: <Camera size={12} />, needsProof: true };
                case "in_transit": return { label: "En transit", icon: <Truck size={12} />, needsProof: false };
                case "delivered":
                case "completed": return { label: "Livré", icon: <Check size={12} />, needsProof: true };
                default: return null;
              }
            };

            const handleQuickStatus = async (itemId: string, itemType: "shipment" | "mission", nextStatus: string, needsProof: boolean) => {
              if (needsProof && nextStatus === "picked_up") {
                // Trigger camera for pickup proof
                setCapturingMissionId(itemId);
                setCapturingType(itemType === "shipment" ? "shipment" : "mission");
                setTimeout(() => cameraRef.current?.click(), 100);
                return;
              }

              if (nextStatus === "delivered" || nextStatus === "completed") {
                // Navigate to detail page where confirmation code entry exists
                if (itemType === "shipment") {
                  navigate(`/shipment/${itemId}`);
                } else {
                  navigate(`/needit/${itemId}`);
                }
                toast.info("Entrez le code de confirmation pour valider la livraison.");
                return;
              }

              // Direct status change (in_transit)
              try {
                if (itemType === "shipment") {
                  await supabase.from("shipments").update({ status: nextStatus as any }).eq("id", itemId);
                  setAcceptedColis(prev => prev.map(s => s.id === itemId ? { ...s, status: nextStatus } : s));
                } else {
                  await supabase.from("needit_missions").update({ status: nextStatus as any }).eq("id", itemId);
                  setAcceptedMissions(prev => prev.map(m => m.id === itemId ? { ...m, status: nextStatus } : m));
                }

                // Notify via edge function
                try {
                  await supabase.functions.invoke("notify-status-change", {
                    body: { item_id: itemId, item_type: itemType === "shipment" ? "shipment" : "needit_mission", new_status: nextStatus },
                  });
                } catch {}

                toast.success("Statut mis à jour ✅");
              } catch (err: any) {
                toast.error(err.message || "Erreur");
              }
            };

            // Batch: mark all picked_up items as in_transit
            const eligibleForBatchTransit = [
              ...acceptedColis.filter(s => s.status === "picked_up").map(s => ({ id: s.id, type: "shipment" as const })),
              ...acceptedMissions.filter(m => m.status === "picked_up").map(m => ({ id: m.id, type: "mission" as const })),
            ];

            const handleBatchTransit = async () => {
              if (eligibleForBatchTransit.length === 0) return;
              setBatchTransiting(true);
              try {
                for (const item of eligibleForBatchTransit) {
                  if (item.type === "shipment") {
                    await supabase.from("shipments").update({ status: "in_transit" as any }).eq("id", item.id);
                  } else {
                    await supabase.from("needit_missions").update({ status: "in_transit" as any }).eq("id", item.id);
                  }
                  try {
                    await supabase.functions.invoke("notify-status-change", {
                      body: { item_id: item.id, item_type: item.type === "shipment" ? "shipment" : "needit_mission", new_status: "in_transit" },
                    });
                  } catch {}
                }
                setAcceptedColis(prev => prev.map(s => s.status === "picked_up" ? { ...s, status: "in_transit" } : s));
                setAcceptedMissions(prev => prev.map(m => m.status === "picked_up" ? { ...m, status: "in_transit" } : m));
                toast.success(`${eligibleForBatchTransit.length} élément(s) passé(s) en transit ✅`);
              } catch (err: any) {
                toast.error(err.message || "Erreur");
              } finally {
                setBatchTransiting(false);
              }
            };

            // Trigger confetti when 100%
            if (progressPct === 100 && total > 0 && !showConfetti) {
              setTimeout(() => setShowConfetti(true), 300);
            }

            return (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <ConfettiCelebration show={showConfetti} />
                {/* Header with progress */}
                <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={13} className="text-primary" />
                      {total} élément{total > 1 ? "s" : ""} lié{total > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {delivered > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check size={10} /> {delivered} livré{delivered > 1 ? "s" : ""}
                        </span>
                      )}
                      {(total - delivered) > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Loader2 size={10} /> {total - delivered} en cours
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <Progress value={progressPct} className={`h-2 flex-1 ${progressPct === 100 ? "[&>div]:bg-emerald-500" : ""}`} />
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{delivered}/{total}</span>
                  </div>
                  {progressPct === 100 && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                      🎉 Toutes les livraisons sont terminées !
                    </p>
                  )}
                  {/* Batch transit button */}
                  {isOwner && eligibleForBatchTransit.length > 1 && (
                    <button
                      onClick={handleBatchTransit}
                      disabled={batchTransiting}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {batchTransiting ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                      Tout passer en transit ({eligibleForBatchTransit.length})
                    </button>
                  )}
                </div>

                <div className="divide-y divide-border">
                  {acceptedColis.map((shipment) => {
                    const st = shipment.status;
                    const badge = st === "delivered" ? { label: "Livré", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
                      : st === "in_transit" ? { label: "En transit", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" }
                      : st === "picked_up" ? { label: "Récupéré", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" }
                      : { label: "Accepté", cls: "bg-primary/10 text-primary" };
                    const next = getNextStatus(st, false);
                    const action = nextActionLabel(next);
                    return (
                      <div key={shipment.id} className="px-4 py-3 space-y-2">
                        <button
                          onClick={() => navigate(`/shipment/${shipment.id}`)}
                          className="w-full flex items-center gap-3 hover:bg-muted/40 transition-colors text-left rounded-lg -mx-1 px-1"
                        >
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Package size={15} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {shipment.departure_city || "—"} → {shipment.arrival_city}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {demandeurNames[shipment.user_id] || "Expéditeur"} · {shipment.tarif} €
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                        </button>
                        {/* Quick action button */}
                        {isOwner && action && next && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQuickStatus(shipment.id, "shipment", next, action.needsProof); }}
                            className="ml-11 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {action.icon} {action.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {acceptedMissions.map((mission) => {
                    const st = mission.status;
                    const badge = st === "completed" ? { label: "Livré", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
                      : st === "in_transit" ? { label: "En transit", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" }
                      : st === "picked_up" ? { label: "Récupéré", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" }
                      : { label: "Acceptée", cls: "bg-primary/10 text-primary" };
                    const next = getNextStatus(st, true);
                    const action = nextActionLabel(next);
                    return (
                      <div key={mission.id} className="px-4 py-3 space-y-2">
                        <button
                          onClick={() => navigate(`/needit/${mission.id}`)}
                          className="w-full flex items-center gap-3 hover:bg-muted/40 transition-colors text-left rounded-lg -mx-1 px-1"
                        >
                          <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                            <ShoppingBag size={15} className="text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {mission.product_name || "Mission NeedIt"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {demandeurNames[mission.user_id] || "Demandeur"}{mission.prix_max ? ` · ${mission.prix_max} €` : ""}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                        </button>
                        {/* Quick action button */}
                        {isOwner && action && next && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQuickStatus(mission.id, "mission", next, action.needsProof); }}
                            className="ml-11 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {action.icon} {action.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Route card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              {transportIcon(voyage.transport_method)}
              <div>
                <p className="font-bold text-foreground">
                  {localizeCity(voyage.departure_city, language)} → {localizeCity(voyage.arrival_city, language)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {localizeCountry(voyage.departure_country, language)} → {localizeCountry(voyage.arrival_country, language)}
                </p>
              </div>
            </div>

            {/* Cannot edit warnings */}
            {isOwner && isActive && hasAcceptedShipments && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{t("dashboard.cannotEditAccepted")}</span>
              </div>
            )}
            {isOwner && isActive && locked24h && !hasAcceptedShipments && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
                <Lock size={14} className="shrink-0 mt-0.5" />
                <span>Les modifications sont verrouillées 24h avant le départ.</span>
              </div>
            )}

            {/* Info grid */}
            {!editing ? (
              <div className="space-y-4">
                <InfoRow icon={<Calendar size={14} />} label={t("trip.departDate")} value={voyage.departure_date} />
                {voyage.departure_time && <InfoRow icon={<Clock size={14} />} label={t("trip.departTime")} value={voyage.departure_time} />}
                {voyage.arrival_date && <InfoRow icon={<Calendar size={14} />} label={t("trip.arrivalDate")} value={voyage.arrival_date} />}
                {voyage.arrival_time && <InfoRow icon={<Clock size={14} />} label={t("trip.arrivalTime")} value={voyage.arrival_time} />}
                {voyage.departure_address && <InfoRow icon={<MapPin size={14} />} label={t("trip.departAddress")} value={voyage.departure_address} />}
                {voyage.arrival_address && <InfoRow icon={<MapPin size={14} />} label={t("trip.arrivalAddress")} value={voyage.arrival_address} />}
                <InfoRow icon={<Users size={14} />} label={t("trip.canPickup")} value={voyage.can_pickup ? "✅" : "❌"} />
                <InfoRow icon={<Package size={14} />} label={t("trip.canMove") || "Peut se déplacer"} value={voyage.can_move ? "✅" : "❌"} />
                <InfoRow icon={<MapPin size={14} />} label={t("trip.deliverToAddress") || "Livrer à domicile"} value={voyage.deliver_to_address ? "✅" : "❌"} />
                <InfoRow icon={<Package size={14} />} label="NeedIt" value={voyage.accept_needit ? "✅" : "❌"} />
                {!editingCutoff ? (
                  <div className="flex items-center justify-between">
                    <InfoRow icon={<Clock size={14} />} label="Fermeture matchs" value={`${voyage.cutoff_hours ?? 24}h avant le départ`} />
                    {canEditCapacity && (
                      <button onClick={() => { setEditCutoffHours(String(voyage.cutoff_hours ?? 24)); setEditingCutoff(true); }} className="ml-2 text-primary">
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                    <select
                      value={editCutoffHours}
                      onChange={(e) => setEditCutoffHours(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    >
                      {[6, 12, 24, 48, 72].map((h) => (
                        <option key={h} value={String(h)}>{h}h avant le départ</option>
                      ))}
                    </select>
                    <button
                      disabled={savingCapacity}
                      onClick={async () => {
                        if (!id) return;
                        setSavingCapacity(true);
                        const { error } = await supabase.from("voyages").update({ cutoff_hours: parseInt(editCutoffHours) }).eq("id", id);
                        setSavingCapacity(false);
                        if (error) { toast.error(t("common.error")); }
                        else { toast.success(t("common.saved")); setEditingCutoff(false); loadVoyage(); }
                      }}
                      className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      {savingCapacity ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button onClick={() => setEditingCutoff(false)} className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                )}
                {voyage.accept_needit && voyage.needit_budget && (
                  <InfoRow icon={<Package size={14} />} label={t("trip.needitBudget") || "Budget NeedIt"} value={`${voyage.needit_budget} €`} />
                )}
                {voyage.capacity_dimensions && (
                  <InfoRow icon={<Weight size={14} />} label={t("trip.volumeDimensions")} value={voyage.capacity_dimensions} />
                )}

                {/* Capacity progress bars */}
                {(voyage.max_weight_kg || voyage.max_items || voyage.capacity_volume_liters) && (() => {
                  const SIZE_WEIGHT: Record<string, number> = { S: 1, M: 5, L: 10, XL: 20 };
                  const usedWeight = (acceptedColis || []).reduce((s: number, c: any) => s + (SIZE_WEIGHT[c.size] || 5), 0)
                    + (acceptedMissions || []).reduce((s: number, m: any) => s + (m.poids ? parseFloat(m.poids) || 1 : 1), 0);
                  const usedItems = (acceptedColis || []).length + (acceptedMissions || []).length;
                  const weightPct = voyage.max_weight_kg ? Math.min((usedWeight / voyage.max_weight_kg) * 100, 100) : 0;
                  const itemsPct = voyage.max_items ? Math.min((usedItems / voyage.max_items) * 100, 100) : 0;

                  return (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Weight size={12} /> {t("trip.capacityTitle")}
                      </h4>

                      {/* Max Weight - inline editable */}
                      {voyage.max_weight_kg && !editingWeight && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              {t("trip.maxWeight")}
                              {canEditCapacity && (
                                <button
                                  onClick={() => { setEditMaxWeight(String(voyage.max_weight_kg)); setEditingWeight(true); }}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                >
                                  <Pencil size={11} />
                                </button>
                              )}
                            </span>
                            <span className={`font-bold ${weightPct >= 90 ? "text-destructive" : weightPct >= 70 ? "text-amber-500" : "text-primary"}`}>
                              {usedWeight.toFixed(1)} / {voyage.max_weight_kg} kg
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${weightPct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${weightPct >= 90 ? "bg-destructive" : weightPct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                            />
                          </div>
                        </div>
                      )}
                      {editingWeight && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editMaxWeight}
                            onChange={(e) => setEditMaxWeight(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="kg"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCapacity("max_weight_kg")}
                            disabled={savingCapacity}
                            className="text-primary hover:text-primary/80 shrink-0"
                          >
                            {savingCapacity ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button onClick={() => setEditingWeight(false)} className="text-muted-foreground hover:text-foreground shrink-0">
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {/* Volume - inline editable */}
                      {voyage.capacity_volume_liters && !editingVolume && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              {t("trip.volumeLiters")}
                              {canEditCapacity && (
                                <button
                                  onClick={() => { setEditVolume(String(voyage.capacity_volume_liters)); setEditingVolume(true); }}
                                  className="text-primary hover:text-primary/80 transition-colors"
                                >
                                  <Pencil size={11} />
                                </button>
                              )}
                            </span>
                            <span className="font-bold text-primary">{voyage.capacity_volume_liters} L</span>
                          </div>
                        </div>
                      )}
                      {editingVolume && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editVolume}
                            onChange={(e) => setEditVolume(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="litres"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCapacity("capacity_volume_liters")}
                            disabled={savingCapacity}
                            className="text-primary hover:text-primary/80 shrink-0"
                          >
                            {savingCapacity ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button onClick={() => setEditingVolume(false)} className="text-muted-foreground hover:text-foreground shrink-0">
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {voyage.max_items && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t("trip.maxItems")}</span>
                            <span className={`font-bold ${itemsPct >= 90 ? "text-destructive" : itemsPct >= 70 ? "text-amber-500" : "text-primary"}`}>
                              {usedItems} / {voyage.max_items}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${itemsPct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                              className={`h-full rounded-full ${itemsPct >= 90 ? "bg-destructive" : itemsPct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.departDate")}</Label>
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.departTime")}</Label>
                  <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.arrivalDate")}</Label>
                  <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.arrivalTime")}</Label>
                  <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.departAddress")}</Label>
                  <Input value={departureAddress} onChange={(e) => setDepartureAddress(e.target.value)} placeholder="123 rue…" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.arrivalAddress")}</Label>
                  <Input value={arrivalAddress} onChange={(e) => setArrivalAddress(e.target.value)} placeholder="456 avenue…" />
                </div>

                {/* Toggle options */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-foreground">{t("trip.canPickup")}</Label>
                    <Switch checked={canPickup} onCheckedChange={setCanPickup} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-foreground">{t("trip.canMove") || "Peut se déplacer"}</Label>
                    <Switch checked={canMove} onCheckedChange={setCanMove} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-foreground">{t("trip.deliverToAddress") || "Livrer à domicile"}</Label>
                    <Switch checked={deliverToAddress} onCheckedChange={setDeliverToAddress} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-foreground">Accepter NeedIt</Label>
                    <Switch checked={acceptNeedit} onCheckedChange={setAcceptNeedit} />
                  </div>
                  {acceptNeedit && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("trip.needitBudget") || "Budget NeedIt (€)"}</Label>
                      <Input
                        type="number"
                        value={needitBudget}
                        onChange={(e) => setNeeditBudget(e.target.value)}
                        placeholder="50"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NeedIt Missions Progress */}
          {acceptedMissions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShoppingBag size={16} className="text-primary" />
                Missions NeedIt acceptées
              </h2>
              {acceptedMissions.map((mission) => (
                <div key={mission.id} className="space-y-2">
                  {mission.user_id && (
                    <button
                      onClick={() => navigate(`/profile/${mission.user_id}`)}
                      className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
                    >
                      <User size={12} /> {demandeurNames[mission.user_id] || "Voir le profil"}
                    </button>
                  )}
                  <AcceptedItemCard
                    id={mission.id}
                    title={mission.product_name || "Mission NeedIt"}
                    price={mission.prix_max}
                    status={mission.status}
                    steps={[
                      { key: "accepted", label: "Acceptée" },
                      { key: "picked_up", label: "Récupéré" },
                      { key: "in_transit", label: "En transit" },
                      { key: "completed", label: "Livré" },
                    ]}
                    onClick={() => navigate(`/needit/${mission.id}`)}
                    blocked={!missionsWithProof.has(mission.id)}
                    blockedMessage="En attente de la preuve d'achat dans le chat avant récupération"
                    previewUrl={previewUrl}
                    capturingId={capturingMissionId}
                    uploadingProof={uploadingProof}
                    onStartCapture={(id) => {
                      setCapturingMissionId(id);
                      setCapturingType("mission");
                      setTimeout(() => cameraRef.current?.click(), 50);
                    }}
                    onRetake={handleRetake}
                    onConfirm={handleConfirmCapture}
                  />
                  {/* OTP codes for this mission */}
                  {mission.status !== "pending" && mission.status !== "cancelled" && (
                    <PostMatchActions
                      shipmentId={mission.id}
                      shipmentStatus={mission.status}
                      senderId={mission.user_id || ""}
                      voyageurId={user?.id || null}
                      onStatusChange={(s) => {
                        setAcceptedMissions(prev => prev.map(m => m.id === mission.id ? { ...m, status: s } : m));
                      }}
                       compact
                       itemType="needit"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Accepted Shipments Progress */}
          {acceptedColis.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Colis acceptés
              </h2>
              {acceptedColis.map((shipment) => (
                <div key={shipment.id} className="space-y-2">
                  {shipment.user_id && (
                    <button
                      onClick={() => navigate(`/profile/${shipment.user_id}`)}
                      className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
                    >
                      <User size={12} /> {demandeurNames[shipment.user_id] || "Voir le profil"}
                    </button>
                  )}
                  <AcceptedItemCard
                    id={shipment.id}
                    title={`${shipment.departure_city || "—"} → ${shipment.arrival_city}`}
                    price={shipment.tarif}
                    status={shipment.status}
                    steps={[
                      { key: "accepted", label: "Accepté" },
                      { key: "picked_up", label: "Récupéré" },
                      { key: "in_transit", label: "En transit" },
                      { key: "delivered", label: "Livré" },
                    ]}
                    onClick={() => navigate(`/shipment/${shipment.id}`)}
                    previewUrl={previewUrl}
                    capturingId={capturingMissionId}
                    uploadingProof={uploadingProof}
                    onStartCapture={(id) => {
                      setCapturingMissionId(id);
                      setCapturingType("shipment");
                      setTimeout(() => cameraRef.current?.click(), 50);
                    }}
                    onRetake={handleRetake}
                    onConfirm={handleConfirmCapture}
                  />
                  {/* OTP codes for this shipment */}
                  {shipment.status !== "pending" && shipment.status !== "cancelled" && (
                    <PostMatchActions
                      shipmentId={shipment.id}
                      shipmentStatus={shipment.status}
                      senderId={shipment.user_id || ""}
                      voyageurId={user?.id || null}
                      onStatusChange={(s) => {
                        setAcceptedColis(prev => prev.map(c => c.id === shipment.id ? { ...c, status: s } : c));
                      }}
                      compact
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hidden camera input */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />

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
                    onClick={() => { setEditing(false); loadVoyage(); }}
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
                  {t("dashboard.cancelVoyage")}
                </button>
              )}

              {!editing && (
                <button
                  onClick={() => setShowReminder(true)}
                  className="w-full py-3 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Bell size={14} /> {t("reminder.btnLabel")}
                </button>
              )}
            </div>
          )}
          {/* Reminder button (always visible when voyage exists and active but can't edit) */}
          {voyage.status === "active" && !canEdit && (
            <button
              onClick={() => setShowReminder(true)}
              className="w-full py-3 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Bell size={14} /> {t("reminder.btnLabel")}
            </button>
          )}
        </div>
      </PageTransition>
      <BottomNav />

      {/* Cancel dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer annulation ?</AlertDialogTitle>
            <AlertDialogDescription>{t("dashboard.cancelVoyageDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reminder dialog */}
      {voyage && (
        <ReminderDialog
          info={{
            itemType: "voyage",
            itemId: voyage.id,
            departureCity: voyage.departure_city,
            arrivalCity: voyage.arrival_city,
            departureDate: voyage.departure_date,
            departureTime: voyage.departure_time,
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

export default VoyageDetail;