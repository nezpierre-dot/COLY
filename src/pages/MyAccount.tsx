import { useNavigate } from "react-router-dom";
import { CheckCircle2, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isVoyageur = roles.includes("voyageur");

  const userId = user?.id?.slice(0, 6) || "000000";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const Section = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card rounded-2xl border border-border divide-y divide-border mb-6">
      {children}
    </div>
  );

  const Row = ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="w-full text-center py-4 text-foreground font-semibold text-sm uppercase tracking-wide hover:bg-muted/50 transition-colors"
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mon Compte</h1>

        {/* Avatar + Role Info */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
              <span className="text-4xl text-muted-foreground">👤</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <button className="text-xs text-muted-foreground mt-1 block text-center w-full">
              <Camera size={12} className="inline mr-1" />
              Changer la photo
            </button>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-foreground">Voyageur</p>
            <p className="text-sm text-muted-foreground">N°{userId.toUpperCase()}</p>
            <p className="font-bold text-foreground mt-2">Expéditeur</p>
            <p className="text-sm text-muted-foreground">N°{(parseInt(userId, 16) % 999999).toString().padStart(6, "0")}</p>
          </div>
        </div>

        {/* First section */}
        <Section>
          <Row label="MES INFORMATIONS" onClick={() => navigate("/settings")} />
          <Row label="RÉGLAGE VOYAGEUR" onClick={() => navigate("/settings")} />
          <Row label="RÉGLAGE EXPÉDITEUR" onClick={() => navigate("/settings")} />
        </Section>

        {/* Second section */}
        <Section>
          <Row label="COMPTABILITÉ" />
          <Row label="CONFIDENTIALITÉ / MENTIONS LÉGALES" onClick={() => navigate("/terms")} />
          <Row label="PARAMETRES DE L'APPLICATION" onClick={() => navigate("/settings")} />
        </Section>

        {/* FAQ / Aide */}
        <div className="flex gap-4">
          <button className="flex-1 py-3 rounded-2xl bg-coly-orange/80 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow">
            FAQ
          </button>
          <button className="flex-1 py-3 rounded-2xl bg-coly-orange/80 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow">
            Aide
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl border border-destructive/30 text-destructive font-medium text-sm hover:bg-destructive/10 transition-colors mt-6"
        >
          Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default MyAccount;
