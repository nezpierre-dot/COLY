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

const Settings = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { theme, setTheme } = useTheme();
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
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border">{children}</div>
    </div>
  );

  const Row = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-muted-foreground" />
        <span className="text-foreground text-sm">{label}</span>
      </div>
      {children}
    </div>
  );

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Auto" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/dashboard")} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Réglages</h1>
        </div>

        {/* Role badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${isVoyageur ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"}`}>
          {isVoyageur ? <Plane size={14} /> : <Package size={14} />}
          {isVoyageur ? "Mode Voyageur" : "Mode Demandeur"}
        </div>

        {/* Apparence */}
        <Section title="Apparence">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <Sun size={18} className="text-muted-foreground" />
              <span className="text-foreground text-sm">Thème</span>
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

        {/* Langue & Région */}
        <Section title="Langue & Région">
          <Row icon={User} label="Modifier le profil">
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
          <Row icon={Globe} label="Langue">
            <span className="text-sm text-muted-foreground">Français</span>
          </Row>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign size={18} className="text-muted-foreground" />
              <span className="text-foreground text-sm">Devise</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_CURRENCIES.slice(0, 6).map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    toast.success(`Devise changée : ${c.label}`);
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-center ${
                    preferredCurrency.code === c.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="text-base font-bold">{c.symbol}</span>
                  <span className="text-[10px] font-medium">{c.code}</span>
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
                      toast.success(`Devise changée : ${c.label}`);
                    }}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all text-center ${
                      preferredCurrency.code === c.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="text-sm font-bold">{c.symbol}</span>
                    <span className="text-[9px] font-medium">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* App & Notifications */}
        <Section title="Application & Notifications">
          <Row icon={isNotifGranted ? BellRing : Bell} label="Notifications push">
            <Switch
              checked={isNotifGranted}
              onCheckedChange={(v) => v ? subscribe() : unsubscribe()}
              disabled={pushLoading || permission === "denied" || permission === "unsupported"}
            />
          </Row>
          <Row icon={Bell} label="Notifications email">
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
                  {isInstalled ? "Appli installée ✓" : "Installer l'application"}
                </span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )}
        </Section>

        {/* Role-specific settings */}
        {isVoyageur ? (
          <Section title="Paramètres Voyageur">
            <Row icon={Plane} label="Acceptation auto des demandes">
              <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
            </Row>
            <Row icon={Shield} label="Afficher mon itinéraire">
              <Switch checked={showItinerary} onCheckedChange={setShowItinerary} />
            </Row>
            <Row icon={CreditCard} label="Tarifs par défaut">
              <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
            </Row>
          </Section>
        ) : (
          <Section title="Paramètres Demandeur">
            <Row icon={Package} label="Alertes de suivi">
              <Switch checked={trackingAlerts} onCheckedChange={setTrackingAlerts} />
            </Row>
            <Row icon={Shield} label="Demandes publiques">
              <Switch checked={publicRequests} onCheckedChange={setPublicRequests} />
            </Row>
            <Row icon={CreditCard} label="Moyens de paiement">
              <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
            </Row>
          </Section>
        )}

        {/* Security */}
        <Section title="Sécurité">
          <Row icon={Shield} label="Changer le mot de passe">
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
        </Section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-destructive/30 text-destructive font-medium text-sm hover:bg-destructive/10 transition-colors mt-2"
        >
          Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
