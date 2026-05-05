import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Loader2, ShieldAlert, Handshake, KeyRound, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

const CRITICAL_EVENTS = [
  { icon: Handshake, label: "Match accepté", desc: "Un voyageur accepte ton colis ou ta mission" },
  { icon: KeyRound, label: "Codes OTP (remise & livraison)", desc: "Codes de confirmation à la prise en charge et à la livraison" },
  { icon: Clock, label: "Rappels de départ", desc: "24h et 2h avant le départ d'un trajet" },
];

const EmailPreferences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [matchEmails, setMatchEmails] = useState(true);
  const [criticalFallback, setCriticalFallback] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("match_emails, critical_email_fallback")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setMatchEmails(data.match_emails);
        setCriticalFallback((data as any).critical_email_fallback ?? true);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updatePref = async (patch: Record<string, any>) => {
    if (!user) return false;
    setSaving(true);
    const { error } = await supabase
      .from("email_preferences")
      .upsert(
        { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    setSaving(false);
    return !error;
  };

  const handleToggleMatch = async (value: boolean) => {
    setMatchEmails(value);
    const ok = await updatePref({ match_emails: value });
    if (!ok) {
      toast.error(t("emailPrefs.saveError"));
      setMatchEmails(!value);
    } else {
      toast.success(value ? t("emailPrefs.matchOn") : t("emailPrefs.matchOff"));
    }
  };

  const handleToggleCritical = async (value: boolean) => {
    setCriticalFallback(value);
    const ok = await updatePref({ critical_email_fallback: value });
    if (!ok) {
      toast.error(t("emailPrefs.saveError"));
      setCriticalFallback(!value);
    } else {
      toast.success(value ? "Email de secours activé" : "Email de secours désactivé");
    }
  };

  return (
    <div className="page-shell">
      <div className="px-6 pt-12 pb-32">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/settings")} className="text-foreground" aria-label="Retour">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">{t("emailPrefs.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8 pl-10">
          {t("emailPrefs.subtitle")}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{t("emailPrefs.matchTitle")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("emailPrefs.matchDesc")}
                    </p>
                  </div>
                </div>
                <Switch checked={matchEmails} onCheckedChange={handleToggleMatch} disabled={saving} />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-destructive" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">Email de secours (événements critiques)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reçois un email quand les notifications push n'arrivent pas (iOS &lt; 16.4 ou app non installée).
                    </p>
                  </div>
                </div>
                <Switch checked={criticalFallback} onCheckedChange={handleToggleCritical} disabled={saving} />
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Événements couverts
                </p>
                {CRITICAL_EVENTS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon size={14} className="text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("emailPrefs.note")}
              </p>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default EmailPreferences;
