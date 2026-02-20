import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MENU_ITEMS = [
  { title: "Facturation", desc: "Historique / Mode de Facturation / Périodes / Taxes et TVA" },
  { title: "Statut de Paiement", desc: "Paiement en attente / Paiement échoués" },
  { title: "Encaissement", desc: "Gestion des encaissement / Historique" },
  { title: "Sécurisation des paiements", desc: "Protections / Assurance de transport" },
  { title: "Abonnements", desc: "Gestion des abonnements / Paiements automatiques" },
  { title: "Remboursements / Réclamations", desc: "Remboursements / Réclamations / Politique appliquée" },
  { title: "Tarification", desc: "Grille tarifaire / Frais / Réduction & Promotion" },
];

export default function FacturationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-8">Facturation & Paiement</h1>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.title}
              className="w-full rounded-2xl border border-border bg-card p-5 text-center hover:bg-muted/50 transition-colors"
            >
              <p className="font-bold text-foreground text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
