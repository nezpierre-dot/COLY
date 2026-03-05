import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Bell, BellRing, Shield, Globe, CreditCard, Plane, Package, Sun, Moon, Monitor, Download, ChevronRight, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useCurrencyPreference, AVAILABLE_CURRENCIES } from "@/hooks/useCurrencyPreference";
import { AVAILABLE_LANGUAGES } from "@/hooks/useLanguagePreference";
import { useTranslation } from "@/hooks/useTranslation";

const Settings = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const isVoyageur = roles.includes("voyageur");
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const { permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const isNotifGranted = permission === "granted";
  const { currency: preferredCurrency, setCurrency } = useCurrencyPreference();

  const [notifications, setNotifications] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [showItinerary, setShowItinerary] = useState(true);
  const [trackingAlerts, setTrackingAlerts] = useState(true);
  const [publicRequests, setPublicRequests] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{title}</h3>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">{children}</div>
    </div>
  );

  const Row = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <Icon size={22} className="text-foreground" />
        <span className="text-foreground text-sm font-medium">{label}</span>
      </div>
      {children}
    </div>
  );

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: t("settings.light") },
    { value: "dark", icon: Moon, label: t("settings.dark") },
    { value: "system", icon: Monitor, label: t("settings.auto") },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/dashboard")} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[26px] font-bold text-foreground leading-tight">{t("settings.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8 pl-10">{t("settings.subtitle")}</p>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${isVoyageur ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"}`}>
          {isVoyageur ? <Plane size={14} /> : <Package size={14} />}
          {isVoyageur ? t("settings.voyageurMode") : t("settings.demandeurMode")}
        </div>

        <Section title={t("settings.appearance")}>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <Sun size={18} className="text-muted-foreground" />
              <span className="text-foreground text-sm">{t("settings.theme")}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      theme === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title={t("settings.langRegion")}>
          <Row icon={User} label={t("settings.editProfile")}>
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <Globe size={18} className="text-muted-foreground" />
              <span className="text-foreground text-sm">{t("settings.language")}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    toast.success(`${t("settings.language")} : ${l.label}`);
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-center ${
                    language === l.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span className="text-[10px] font-medium">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign size={18} className="text-muted-foreground" />
              <span className="text-foreground text-sm">{t("settings.currency")}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_CURRENCIES.slice(0, 6).map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    toast.success(`${t("settings.currency")} : ${c.label}`);
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-center ${
                    preferredCurrency.code === c.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="text-sm font-bold">{c.symbol}</span>
                  <span className="text-xs font-medium">{c.code}</span>
                </button>
              ))}
            </div>
            {AVAILABLE_CURRENCIES.length > 6 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {AVAILABLE_CURRENCIES.slice(6).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.code);
                      toast.success(`${t("settings.currency")} : ${c.label}`);
                    }}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all text-center ${
                      preferredCurrency.code === c.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                     <span className="text-sm">{c.flag}</span>
                     <span className="text-sm font-bold">{c.symbol}</span>
                     <span className="text-[9px] font-medium">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title={t("settings.appNotif")}>
          <Row icon={isNotifGranted ? BellRing : Bell} label={t("settings.pushNotif")}>
            <Switch
              checked={isNotifGranted}
              onCheckedChange={(v) => v ? subscribe() : unsubscribe()}
              disabled={pushLoading || permission === "denied" || permission === "unsupported"}
            />
          </Row>
          <Row icon={Bell} label={t("settings.emailNotif")}>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </Row>
          {(canInstall || !isInstalled) && (
            <button
              onClick={() => navigate("/install")}
              className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-muted-foreground" />
                <span className="text-foreground text-sm">
                  {isInstalled ? t("settings.appInstalled") : t("settings.installApp")}
                </span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )}
        </Section>

        <Section title="Paramètres utilisateur">
          <Row icon={Plane} label={t("settings.autoAccept")}>
            <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
          </Row>
          <Row icon={Shield} label={t("settings.showItinerary")}>
            <Switch checked={showItinerary} onCheckedChange={setShowItinerary} />
          </Row>
          <Row icon={Package} label={t("settings.trackingAlerts")}>
            <Switch checked={trackingAlerts} onCheckedChange={setTrackingAlerts} />
          </Row>
          <Row icon={CreditCard} label={t("settings.paymentMethods")}>
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
        </Section>
        <Section title={t("settings.security")}>
          <Row icon={Shield} label={t("settings.changePassword")}>
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
        </Section>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-destructive/30 text-destructive font-medium text-sm hover:bg-destructive/10 transition-colors mt-2"
        >
          {t("common.logout")}
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
