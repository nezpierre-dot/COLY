import { useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();

  const isVoyageur = roles.includes("voyageur");
  const isDemandeur = roles.includes("demandeur");

  const toggleRole = async () => {
    if (!user) return;
    const newRole = isVoyageur ? "demandeur" : "voyageur";
    
    // Remove current roles and add new one
    await supabase.from("user_roles").delete().eq("user_id", user.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: newRole });
    
    if (error) {
      toast.error("Erreur lors du changement de rôle");
    } else {
      // Reload to refresh roles
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        {/* Header with toggle */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-foreground">
            {isVoyageur ? "Espace Voyageur" : "Espace Demandeur"}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRole}
              className={`w-14 h-8 rounded-full relative transition-colors ${isVoyageur ? "bg-coly-purple" : "bg-muted"}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow absolute top-1 transition-transform ${isVoyageur ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {isVoyageur ? (
          <div className="flex flex-col items-center justify-center mt-32">
            <button
              onClick={() => navigate("/new-trip")}
              className="w-full py-4 rounded-2xl bg-coly-purple/30 border border-coly-purple/40 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/40 transition-colors"
            >
              Je propose un nouveau voyage <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors">
              Je propose une mission d'achat Needit
            </button>
            <button className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg flex items-center justify-center gap-2 hover:bg-coly-purple/30 transition-colors">
              Mes Missions Needit <ArrowRight size={20} />
            </button>
            <div className="h-8" />
            <button
              onClick={() => navigate("/send-coly")}
              className="w-full py-4 rounded-2xl bg-coly-blue/20 border border-coly-blue/30 text-coly-blue font-medium text-lg hover:bg-coly-blue/30 transition-colors"
            >
              Je propose un envoi COLY
            </button>
            <button className="w-full py-4 rounded-2xl bg-coly-purple/20 border border-coly-purple/30 text-coly-purple font-medium text-lg hover:bg-coly-purple/30 transition-colors">
              Mes Envois COLY
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
