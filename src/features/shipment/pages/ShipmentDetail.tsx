import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Package, Shield, Clock, Pencil, X, Check, Loader2, AlertTriangle, User, Phone, Mail, Bell } from "lucide-react";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import LiveLocationSharing from "@/components/LiveLocationSharing";
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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Editable fields
  const [departureDate, setDepartureDate] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const loadShipment = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("shipments").select("*").eq("id", id).maybeSingle();
    if (data) {
      setShipment(data);
      setDepartureDate(data.departure_date || "");
      setContactNom(data.contact_nom || "");
      setContactPrenom(data.contact_prenom || "");
      setContactTel(data.contact_tel || "");
      setContactEmail(data.contact_email || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadShipment(); }, [loadShipment]);

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
    }).eq("id", id);
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
    if (!id) return;
    setSaving(true);
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
        message: `L'envoi COLY-${shipment.id.slice(0, 8).toUpperCase()} a été annulé par l'expéditeur. Le budget sera remboursé si déjà payé.`,
        type: "shipment_cancelled:" + id,
      });
    }
    setSaving(false);
    toast.success(t("dashboard.cancelledSuccess"));
    navigate("/dashboard");
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
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
    <div className="min-h-screen bg-background pb-24">
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
              REF: COLY-{shipment.id.slice(0, 8).toUpperCase()}
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
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("sendcoly.destinationContact")}</p>
                  <InfoRow icon={<User size={14} />} label={t("common.name")} value={`${shipment.contact_prenom} ${shipment.contact_nom}`} />
                  <InfoRow icon={<Phone size={14} />} label={t("common.phone")} value={shipment.contact_tel} />
                  {shipment.contact_email && <InfoRow icon={<Mail size={14} />} label="Email" value={shipment.contact_email} />}
                </div>
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
              </div>
            )}
          </div>

          {/* Photo */}
          {shipment.photo_url && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <img src={shipment.photo_url} alt="Colis" className="w-full h-48 object-cover rounded-xl" />
            </div>
          )}

          {/* Live location sharing - visible when mission is accepted */}
          {shipment.voyageur_id && shipment.status !== "pending" && shipment.status !== "cancelled" && shipment.status !== "delivered" && (
            <LiveLocationSharing
              itemId={shipment.id}
              voyageurId={shipment.voyageur_id}
              isVoyageur={user?.id === shipment.voyageur_id}
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
            <button
              onClick={() => navigate(`/tracking/${shipment.id}`)}
              className="w-full py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm"
            >
              {t("tracking.viewTracking")}
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

          {/* Cancel button for owner when shipment is accepted */}
          {isOwner && isAccepted && shipment.status !== "cancelled" && shipment.status !== "delivered" && !canEdit && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2"
            >
              <X size={16} /> Annuler l'envoi
            </button>
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
