import { useState, useEffect } from "react";
import { Bell, BellOff, Calendar as CalendarIcon, Clock, Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { downloadICS, getGoogleCalendarUrl, type CalendarEvent } from "@/lib/calendarExport";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ReminderInfo {
  itemType: "voyage" | "shipment" | "needit_mission";
  itemId: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string; // YYYY-MM-DD
  departureTime?: string | null; // HH:mm
  title?: string;
}

interface Props {
  info: ReminderInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DELAY_OPTIONS = [
  { value: "24h", labelKey: "reminder.24hBefore", ms: 24 * 60 * 60 * 1000 },
  { value: "2h", labelKey: "reminder.2hBefore", ms: 2 * 60 * 60 * 1000 },
  { value: "30min", labelKey: "reminder.30minBefore", ms: 30 * 60 * 1000 },
] as const;

const ReminderDialog = ({ info, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedDelay, setSelectedDelay] = useState<string>("24h");
  const [saving, setSaving] = useState(false);
  const [existingReminder, setExistingReminder] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Load existing reminder
  useEffect(() => {
    if (!open || !user) return;
    setLoadingExisting(true);
    supabase
      .from("reminders" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("item_id", info.itemId)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        setExistingReminder(data);
        if (data) setSelectedDelay((data as any).delay_label);
        setLoadingExisting(false);
      });
  }, [open, user, info.itemId]);

  const getDepartureDateTime = (): Date => {
    const dateStr = info.departureDate;
    const timeStr = info.departureTime || "08:00";
    return new Date(`${dateStr}T${timeStr}:00`);
  };

  const getRemindAt = (delay: string): Date => {
    const departure = getDepartureDateTime();
    const opt = DELAY_OPTIONS.find((d) => d.value === delay)!;
    return new Date(departure.getTime() - opt.ms);
  };

  const buildTitle = () =>
    `Rappel Coly : ${info.departureCity} → ${info.arrivalCity}`;

  const buildBody = () =>
    `Départ ${info.departureCity} → ${info.arrivalCity} le ${info.departureDate}${info.departureTime ? ` à ${info.departureTime}` : ""}. Vérifie ton statut.`;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const remindAt = getRemindAt(selectedDelay);
    const title = buildTitle();
    const body = buildBody();

    if (existingReminder) {
      const { error } = await supabase
        .from("reminders" as any)
        .update({ remind_at: remindAt.toISOString(), delay_label: selectedDelay, title, body } as any)
        .eq("id", (existingReminder as any).id);
      if (error) {
        toast.error(t("common.error"));
      } else {
        toast.success(t("reminder.updated"));
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase.from("reminders" as any).insert({
        user_id: user.id,
        item_type: info.itemType,
        item_id: info.itemId,
        remind_at: remindAt.toISOString(),
        delay_label: selectedDelay,
        status: "pending",
        title,
        body,
      } as any);
      if (error) {
        toast.error(t("common.error"));
      } else {
        toast.success(t("reminder.created"));
        onOpenChange(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!existingReminder) return;
    setSaving(true);
    await supabase.from("reminders" as any).delete().eq("id", (existingReminder as any).id);
    toast.success(t("reminder.deleted"));
    setExistingReminder(null);
    setSaving(false);
    onOpenChange(false);
  };

  const calendarEvent: CalendarEvent = {
    title: `Coly : ${info.departureCity} → ${info.arrivalCity}`,
    description: `${buildBody()}\n\nRéf: ${info.itemType.toUpperCase()}-${info.itemId.slice(0, 8).toUpperCase()}`,
    location: info.departureCity,
    startDate: getDepartureDateTime(),
    endDate: new Date(getDepartureDateTime().getTime() + 2 * 60 * 60 * 1000),
    url: `${window.location.origin}/${info.itemType === "voyage" ? "voyage" : info.itemType === "shipment" ? "shipment" : "needit-mission"}/${info.itemId}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Bell size={18} className="text-primary" />
            {existingReminder ? t("reminder.manage") : t("reminder.add")}
          </DialogTitle>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Delay selection */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("reminder.chooseDelay")}</p>
              <div className="grid grid-cols-3 gap-2">
                {DELAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedDelay(opt.value)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedDelay === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    <Clock size={12} className="mx-auto mb-1" />
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Save / Update */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
              {existingReminder ? t("reminder.update") : t("reminder.activate")}
            </button>

            {/* Delete existing */}
            {existingReminder && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-2.5 rounded-2xl border border-destructive/30 text-destructive font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> {t("reminder.delete")}
              </button>
            )}

            {/* Calendar export section */}
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon size={14} className="text-primary" />
                {t("reminder.addToCalendar")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(getGoogleCalendarUrl(calendarEvent), "_blank")}
                  className="flex-1 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                >
                  <ExternalLink size={14} /> Google
                </button>
                <button
                  onClick={() => downloadICS(calendarEvent)}
                  className="flex-1 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                >
                  <Download size={14} /> .ics (Apple)
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
