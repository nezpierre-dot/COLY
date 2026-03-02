import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Package, Clock, Pencil, X, Check, Loader2, AlertTriangle, Scale, Maximize2, DollarSign, Bell, Info, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import LiveLocationSharing from "@/components/LiveLocationSharing";
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

  // Editable fields
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [timing, setTiming] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [autoAccept, setAutoAccept] = useState(false);

  const loadMission = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("needit_missions").select("*").eq("id", id).maybeSingle();
    if (data) {
      setMission(data);
      setCountry(data.country || "");
      setCity(data.city || "");
      setTiming(data.timing || "asap");
      setPrixMax(data.prix_max || "");
      setAutoAccept((data as any).auto_accept ?? false);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadMission(); }, [loadMission]);

  const isOwner = mission && mission.user_id === user?.id;
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
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
    } else {
      toast.success(t("dashboard.cancelledSuccess"));
      navigate(-1);
    }
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
    completed: { label: t("missions.completed"), color: "bg-muted" },
    cancelled: { label: t("dashboard.cancelled"), color: "bg-destructive" },
  };
  const st = statusMap[mission.status] || statusMap.pending;

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

          {/* Product card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              {mission.photo_url && (
                <img src={mission.photo_url} alt="Produit" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-lg truncate">
                  {mission.product_name || mission.category_path?.[mission.category_path.length - 1] || t("missions.unlistedProduct")}
                </p>
                {mission.category_path?.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{mission.category_path.join(" → ")}</p>
                )}
              </div>
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

          {/* Live location sharing - visible when mission is accepted */}
          {mission.voyageur_id && mission.status === "accepted" && (
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
        </div>
      </PageTransition>
      <BottomNav />

      {/* Cancel dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.cancelMission")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dashboard.cancelMissionDesc")}</AlertDialogDescription>
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
