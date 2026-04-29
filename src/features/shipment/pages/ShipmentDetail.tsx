import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Package, Shield, Clock, Pencil, X, Check, Loader2, AlertTriangle, User, Phone, Mail, Bell, Camera, PackageCheck } from "lucide-react";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import PhotoLightbox from "@/components/PhotoLightbox";
import ProofGallery from "@/components/ProofGallery";
import PostMatchActions from "@/components/PostMatchActions";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ShipmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const [shipment, setShipment] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [voyageurName, setVoyageurName] = useState<string | null>(null);
  const [pickupProofs, setPickupProofs] = useState<any[]>([]);
  const [deliveryProofs, setDeliveryProofs] = useState<any[]>([]);

  // Editable fields
  const [departureDate, setDepartureDate] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupAccessCode, setPickupAccessCode] = useState("");

  const loadShipment = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("shipments").select("*").eq("id", id).maybeSingle();
    if (data) {
      setShipment(data);
      setCurrentStatus(data.status || "pending");
      setDepartureDate(data.departure_date || "");
      setContactNom(data.contact_nom || "");
      setContactPrenom(data.contact_prenom || "");
      setContactTel(data.contact_tel || "");
      setContactEmail(data.contact_email || "");
      setPickupAddress(data.pickup_address || "");
      setPickupAccessCode(data.pickup_access_code || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadShipment(); }, [loadShipment]);

  // Fetch voyageur profile name
  useEffect(() => {
    if (!shipment?.voyageur_id) return;
    supabase.from("profiles_public" as any).select("full_name").eq("user_id", shipment.voyageur_id).maybeSingle()
      .then(({ data }: any) => { if (data) setVoyageurName(data.full_name); });
  }, [shipment?.voyageur_id]);

  // Fetch pickup & delivery proofs
  useEffect(() => {
    if (!id) return;
    supabase.from("pickup_proofs").select("*").eq("shipment_id", id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setPickupProofs(data); });
    supabase.from("delivery_proofs").select("*").eq("shipment_id", id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setDeliveryProofs(data); });
  }, [id, shipment?.status]);

  const isOwner = shipment?.user_id === user?.id;
  const isPending = shipment?.status === "pending";
  const canEdit = isOwner && isPending;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("shipments").update({
      departure_date: departureDate,
      contact_nom: contactNom,
      contact_prenom: contactPrenom,
      contact_tel: contactTel,
      contact_email: contactEmail || null,
      pickup_address: pickupAddress || null,
      pickup_access_code: pickupAccessCode || null,
    } as any).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("common.saved"));
      setEditing(false);
      loadShipment();
    }
  };

  const isAccepted = shipment?.voyageur_id != null && shipment?.status !== "pending";

  const handleCancel = async () => {
    if (!id || !shipment) return;
    setSaving(true);
    // Archive if matched
    const { archiveCancelledMatch } = await import("@/lib/archiveCancelledMatch");
    await archiveCancelledMatch({
      item_type: "shipment", item_id: id, user_id: shipment.user_id,
      voyageur_id: shipment.voyageur_id, departure_city: shipment.departure_city,
      arrival_city: shipment.arrival_city, arrival_country: shipment.arrival_country,
      tarif: shipment.tarif, original_status: shipment.status,
    });
    const { error } = await supabase.from("shipments").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      setSaving(false);
      toast.error(t("common.error"));
      return;
    }
    // Notify voyageur if shipment was accepted
    if (shipment?.voyageur_id) {
      await supabase.from("notifications").insert({
        user_id: shipment.voyageur_id,
        title: "Envoi annulé ❌",
        message: `L'envoi NIDIT-${shipment.id.slice(0, 8).toUpperCase()} a été annulé par l'expéditeur. Le budget sera remboursé si déjà payé.`,
        type: "shipment_cancelled:" + id,
      });
    }
    setSaving(false);
    toast.success(t("dashboard.cancelledSuccess"));
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">{t("common.notFound")}</p>
        <button onClick={() => navigate("/dashboard")} className="text-primary font-semibold">{t("common.back")}</button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500",
    accepted: "bg-primary",
    picked_up: "bg-secondary",
    in_transit: "bg-accent",
    delivered: "bg-emerald-500",
    cancelled: "bg-destructive",
  };

  const statusLabels: Record<string, string> = {
    pending: t("tracking.pending"),
    accepted: t("tracking.accepted"),
    picked_up: t("tracking.pickedUp"),
    in_transit: t("tracking.inTransit"),
    delivered: t("tracking.delivered"),
    cancelled: t("tracking.cancelled"),
  };

  return (
    <div className="page-shell">
      <PageTransition>
        {/* Header */}
        <div className="px-6 pt-12 pb-6 rounded-b-3xl" style={{ background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)))" }}>
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-primary-foreground">{t("dashboard.shipmentDetail")}</h1>
            <div className="w-6" />
          </div>
        </div>

        <div className="px-6 pt-6 space-y-4">
          {/* Status + ref */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${statusColors[shipment.status] || "bg-muted"}`}>
              {statusLabels[shipment.status] || shipment.status}
            </span>
            <span className="text-xs text-muted-foreground">
              REF: NIDIT-{shipment.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Cannot edit warning */}
          {isOwner && !isPending && shipment.status !== "cancelled" && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{t("dashboard.cannotEditAccepted")}</span>
            </div>
          )}

          {/* Route card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Package size={18} className="text-primary" />
              <div>
                <p className="font-bold text-foreground">
                  {shipment.departure_city ? localizeCity(shipment.departure_city, language) : "—"} → {localizeCity(shipment.arrival_city, language)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {localizeCountry(shipment.arrival_country, language)}
                </p>
              </div>
            </div>

            {/* Info */}
            {!editing ? (
              <div className="space-y-3">
                <InfoRow icon={<Calendar size={14} />} label={t("trip.departDate")} value={shipment.departure_date} />
                <InfoRow icon={<Package size={14} />} label={t("coly.parcel")} value={`${shipment.size} — ${shipment.tarif}`} />
                {shipment.insured && <InfoRow icon={<Shield size={14} />} label={t("coly.insurance")} value="AXA ✅" />}
                {(shipment.departure_address || shipment.departure_access_code) && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">📍 Adresse de départ</p>
                    {shipment.departure_address && <InfoRow icon={<MapPin size={14} />} label="Adresse" value={shipment.departure_address} />}
                    {shipment.departure_access_code && <InfoRow icon={<span className="text-xs">🔑</span>} label="Code d'accès" value={shipment.departure_access_code} />}
                  </div>
                )}
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("sendcoly.destinationContact")}</p>
                  <InfoRow icon={<User size={14} />} label={t("common.name")} value={`${shipment.contact_prenom} ${shipment.contact_nom}`} />
                  <InfoRow icon={<Phone size={14} />} label={t("common.phone")} value={shipment.contact_tel} />
                {shipment.contact_email && <InfoRow icon={<Mail size={14} />} label="Email" value={shipment.contact_email} />}
                </div>
                {(shipment.pickup_address || shipment.pickup_access_code) && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">📍 Récupération</p>
                    {shipment.pickup_address && <InfoRow icon={<MapPin size={14} />} label="Adresse" value={shipment.pickup_address} />}
                    {shipment.pickup_access_code && <InfoRow icon={<span className="text-xs">🔑</span>} label="Code d'accès" value={shipment.pickup_access_code} />}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("trip.departDate")}</Label>
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("sendcoly.destinationContact")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("common.firstName")}</Label>
                      <Input value={contactPrenom} onChange={(e) => setContactPrenom(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("common.name")}</Label>
                      <Input value={contactNom} onChange={(e) => setContactNom(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">{t("common.phone")}</Label>
                    <Input value={contactTel} onChange={(e) => setContactTel(e.target.value)} />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </div>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">📍 Récupération</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Adresse complète de récupération</Label>
                    <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Ex : 12 rue de la Paix, 75002 Paris" />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Code d'accès / étage / interphone</Label>
                    <Input value={pickupAccessCode} onChange={(e) => setPickupAccessCode(e.target.value)} placeholder="Optionnel" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photo */}
          <div className="bg-card border border-border rounded-2xl p-4">
            {shipment.photo_url ? (
              <img src={shipment.photo_url} alt="Colis" className="w-full h-auto object-cover" style={{ borderRadius: 12 }} />
            ) : (
              <div className="w-full py-12 bg-muted flex flex-col items-center justify-center gap-2" style={{ borderRadius: 12 }}>
                <Package size={32} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aucune photo fournie</span>
              </div>
            )}
          </div>

          {/* Pickup proofs */}
          {pickupProofs.length > 0 && (
            <ProofGallery
              proofs={pickupProofs}
              icon={<PackageCheck size={16} className="text-primary" />}
              title="Preuve de récupération"
              canDownload={isOwner || shipment?.voyageur_id === user?.id}
            />
          )}

          {deliveryProofs.length > 0 && (
            <ProofGallery
              proofs={deliveryProofs}
              icon={<Camera size={16} className="text-emerald-600" />}
              title="Preuve de livraison"
              canDownload={isOwner || shipment?.voyageur_id === user?.id}
            />
          )}
          {shipment.voyageur_id && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">🚀 Voyageur assigné</p>
              <button
                onClick={() => navigate(`/profile/${shipment.voyageur_id}`)}
                className="flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
              >
                <User size={14} />
                {voyageurName || "Voir le profil"}
              </button>
            </div>
          )}

          {/* Post-match actions (OTP, location, status transitions) */}
          {shipment.voyageur_id && shipment.status !== "pending" && shipment.status !== "cancelled" && (
            <PostMatchActions
              shipmentId={shipment.id}
              shipmentStatus={currentStatus}
              senderId={shipment.user_id}
              voyageurId={shipment.voyageur_id}
              onStatusChange={(s) => { setCurrentStatus(s); loadShipment(); }}
            />
          )}

          {/* Reminder button */}
          {shipment.status !== "cancelled" && shipment.status !== "delivered" && (
            <button
              onClick={() => setShowReminder(true)}
              className="w-full py-3 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Bell size={14} /> {t("reminder.btnLabel")}
            </button>
          )}

          {/* Tracking link */}
          {shipment.status !== "pending" && shipment.status !== "cancelled" && (
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/tracking/${shipment.id}`)}
                className="flex-1 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm"
              >
                {t("tracking.viewTracking")}
              </button>
              {(shipment.status === "accepted" || shipment.status === "picked_up" || shipment.status === "in_transit") && (
                <button
                  onClick={() => navigate(`/live-tracking/${shipment.id}`)}
                  className="py-3.5 px-5 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center gap-2"
                >
                  <MapPin size={14} /> Live
                </button>
              )}
            </div>
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
                    onClick={() => { setEditing(false); loadShipment(); }}
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
                  {t("dashboard.cancelShipment")}
                </button>
              )}
            </div>
          )}

          {/* Cancel button — only when accepted (before pickup) */}
          {isOwner && isAccepted && shipment.status === "accepted" && !canEdit && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2"
            >
              <X size={16} /> Annuler l'envoi
            </button>
          )}

          {/* After pickup: dispute instead of cancel */}
          {isOwner && isAccepted && (shipment.status === "picked_up" || shipment.status === "in_transit") && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Le colis a déjà été récupéré par le voyageur. L'annulation n'est plus possible. En cas de problème, ouvrez un litige.</span>
              </div>
              <button
                onClick={() => navigate(`/disputes?shipment=${shipment.id}`)}
                className="w-full py-3.5 rounded-2xl border border-destructive/30 text-destructive font-bold text-sm flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} /> Signaler un litige
              </button>
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{isAccepted ? "Annuler l'envoi" : t("dashboard.cancelShipment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAccepted
                ? "Voulez-vous vraiment annuler ? Le voyageur sera notifié et le budget remboursé."
                : t("dashboard.cancelShipmentDesc")}
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

      {/* Reminder dialog */}
      {shipment && (
        <ReminderDialog
          info={{
            itemType: "shipment",
            itemId: shipment.id,
            departureCity: shipment.departure_city || "—",
            arrivalCity: shipment.arrival_city,
            departureDate: shipment.departure_date,
          }}
          open={showReminder}
          onOpenChange={setShowReminder}
        />
      )}
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3 py-0.5">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

export default ShipmentDetail;
