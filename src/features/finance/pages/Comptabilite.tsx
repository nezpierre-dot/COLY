import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

export default function Comptabilite() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const MENU_ITEMS = [
    { label: t("compta.balance"), route: "/solde" },
    { label: t("compta.senderStatements"), route: "/history/coly" },
    { label: t("compta.travelerStatements"), route: "/history/voyageur" },
    { label: t("compta.myRib"), route: "/payment-methods" },
    { label: t("compta.paymentMethods"), route: "/payment-methods" },
    { label: t("compta.billingPayments"), route: "/facturation" },
  ];

  // Placeholder: no statements yet
  const hasStatements = false;

  return (
    <div className="page-shell">
      <header className="page-header-soft">
        <div className="page-content">
          <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-card/80 backdrop-blur shadow-soft hover:bg-card transition" aria-label={t("common.back")}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{t("compta.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("compta.section")}</p>
        </div>
      </header>

      <main className="page-content pt-6 space-y-5">
        {!hasStatements && (
          <div className="card-future-soft flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Aucun relevé pour le moment</p>
          </div>
        )}

        <button
          onClick={() => navigate("/payment-methods")}
          className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-elevated hover:opacity-95 transition"
        >
          <Plus size={18} /> Ajouter RIB
        </button>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => item.route && navigate(item.route)}
              className="card-future w-full text-left flex items-center justify-between hover:shadow-elevated transition-all hover:-translate-y-0.5"
            >
              <span className="font-semibold text-foreground text-sm">{item.label}</span>
              <ArrowLeft size={18} className="rotate-180 text-muted-foreground" />
            </button>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
