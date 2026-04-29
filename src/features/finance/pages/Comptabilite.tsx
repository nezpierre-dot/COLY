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
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate("/my-account")} className="icon-btn-soft" aria-label={t("common.back")}>
              <ArrowLeft size={18} className="text-foreground" />
            </button>
          </div>
          <span className="greeting-bubble-xl mb-3">
            <FileText size={18} className="text-primary" />
            {t("compta.title")}
          </span>
          <h1 className="text-[clamp(1.85rem,5.5vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            {t("compta.headline.l1")}<br />
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">{t("compta.headline.l2")}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground font-medium max-w-[280px]">
            {t("compta.section")}
          </p>
        </div>
      </header>

      <main className="page-content pt-6 space-y-5">
        {!hasStatements && (
          <div className="card-future-soft flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">{t("compta.empty")}</p>
          </div>
        )}

        <button
          onClick={() => navigate("/payment-methods")}
          className="w-full py-4 rounded-2xl bg-gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-elevated hover:opacity-95 transition"
        >
          <Plus size={18} /> {t("compta.addRib")}
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
