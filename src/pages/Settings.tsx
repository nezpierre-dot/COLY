import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Bell, Shield, Globe, CreditCard, Plane, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";

const Settings = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isVoyageur = roles.includes("voyageur");
  const isDemandeur = roles.includes("demandeur");

  const [notifications, setNotifications] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  // Voyageur-specific
  const [autoAccept, setAutoAccept] = useState(false);
  const [showItinerary, setShowItinerary] = useState(true);
  // Demandeur-specific
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
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${isVoyageur ? "bg-coly-purple/20 text-coly-purple" : "bg-coly-blue/20 text-coly-blue"}`}>
          {isVoyageur ? <Plane size={14} /> : <Package size={14} />}
          {isVoyageur ? "Mode Voyageur" : "Mode Demandeur"}
        </div>

        {/* General settings */}
        <Section title="Général">
          <Row icon={User} label="Modifier le profil">
            <ArrowLeft size={16} className="text-muted-foreground rotate-180" />
          </Row>
          <Row icon={Globe} label="Langue">
            <span className="text-sm text-muted-foreground">Français</span>
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row icon={Bell} label="Notifications push">
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </Row>
          <Row icon={Bell} label="Notifications email">
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </Row>
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
