import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MENU_ITEMS = [
  { label: "SOLDE", route: "/solde" },
  { label: "Relevés Expéditeur", route: "/history/coly" },
  { label: "Relevés Voyageur", route: "/history/voyageur" },
  { label: "Mon rib", route: "/payment-methods" },
  { label: "Méthodes de Paiement", route: "/payment-methods" },
  { label: "Facturation et Paiements", route: "/facturation" },
];

export default function Comptabilite() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-6">Mon Compte</h1>

        {/* Section header */}
        <div className="w-full py-4 rounded-2xl bg-coly-purple/20 text-center mb-6">
          <span className="text-lg font-bold text-foreground">Comptabilité</span>
        </div>

        {/* Menu items */}
        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => item.route && navigate(item.route)}
              className="w-full py-4 rounded-2xl border border-border bg-card text-center text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
