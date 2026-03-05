import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Plane, Train, Car, Bus, Ship, Bike, Clock, Pencil, X, Check, Loader2, AlertTriangle, Package, Users, Bell, Lock } from "lucide-react";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import { motion } from "framer-motion";
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

  const isOwner = voyage && voyage.user_id === user?.id;
  const isActive = voyage && voyage.status === "active";
  const [hasAcceptedShipments, setHasAcceptedShipments] = useState(false);

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

  // Check if any shipment has been accepted for this specific voyage route & date
  useEffect(() => {
    if (!voyage || !user) return;
    const checkAccepted = async () => {
      const { data: shipData } = await supabase
        .from("shipments")
        .select("id")
        .eq("voyageur_id", user.id)
        .in("status", ["accepted", "picked_up", "in_transit"])
        .eq("arrival_city", voyage.arrival_city)
        .eq("arrival_country", voyage.arrival_country)
        .eq("departure_date", voyage.departure_date)
        .limit(1);

      const { data: missionData } = await supabase
        .from("needit_missions")
        .select("id")
        .eq("voyageur_id", user.id)
        .eq("status", "accepted")
        .eq("country", voyage.arrival_country)
        .eq("city", voyage.arrival_city)
        .limit(1);

      setHasAcceptedShipments(
        (shipData?.length || 0) > 0 || (missionData?.length || 0) > 0
      );
    };
    checkAccepted();
  }, [voyage, user]);

  const locked24h = isWithin24h();
  const canEdit = isOwner && isActive && !hasAcceptedShipments && !locked24h;

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

  const statusColor = voyage.status === "active" ? "bg-primary" : voyage.status === "cancelled" ? "bg-destructive" : "bg-muted";
  const statusLabel = voyage.status === "active" ? t("dashboard.active") : voyage.status === "cancelled" ? t("dashboard.cancelled") : voyage.status;

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
                {voyage.accept_needit && voyage.needit_budget && (
                  <InfoRow icon={<Package size={14} />} label={t("trip.needitBudget") || "Budget NeedIt"} value={`${voyage.needit_budget} €`} />
                )}
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