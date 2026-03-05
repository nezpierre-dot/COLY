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
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4"><ArrowLeft size={24} /></button>
        <h1 className="text-3xl font-bold text-foreground mb-6">{t("compta.title")}</h1>
        <div className="w-full py-4 rounded-2xl bg-coly-purple/20 text-center mb-6">
          <span className="text-lg font-bold text-foreground">{t("compta.section")}</span>
        </div>

        {!hasStatements && (
          <div className="flex flex-col items-center justify-center py-10 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Aucun relevé</p>
          </div>
        )}

        <button
          onClick={() => navigate("/payment-methods")}
          className="w-full py-4 rounded-2xl bg-[#0D84FF] text-white font-bold text-sm flex items-center justify-center gap-2 mb-6"
        >
          <Plus size={16} /> Ajouter RIB
        </button>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button key={item.label} onClick={() => item.route && navigate(item.route)} className="w-full py-4 rounded-2xl border border-border bg-card text-center text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors">{item.label}</button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
