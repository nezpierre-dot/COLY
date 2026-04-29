import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/lib/i18n";

const EmailPreferences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [matchEmails, setMatchEmails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("email_preferences")
        .select("match_emails")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setMatchEmails(data.match_emails);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleToggle = async (value: boolean) => {
    if (!user) return;
    setSaving(true);
    setMatchEmails(value);

    const { error } = await supabase
      .from("email_preferences")
      .upsert(
        { user_id: user.id, match_emails: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    setSaving(false);
    if (error) {
      toast.error(t("emailPrefs.saveError"));
      setMatchEmails(!value);
    } else {
      toast.success(value ? t("emailPrefs.matchOn") : t("emailPrefs.matchOff"));
    }
  };

  return (
    <div className="page-shell">
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/settings")} className="text-foreground">
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
                <Switch
                  checked={matchEmails}
                  onCheckedChange={handleToggle}
                  disabled={saving}
                />
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
