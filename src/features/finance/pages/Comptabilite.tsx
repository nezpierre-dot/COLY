import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4"><ArrowLeft size={24} /></button>
        <h1 className="text-3xl font-bold text-foreground mb-6">{t("compta.title")}</h1>
        <div className="w-full py-4 rounded-2xl bg-coly-purple/20 text-center mb-6">
          <span className="text-lg font-bold text-foreground">{t("compta.section")}</span>
        </div>
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
