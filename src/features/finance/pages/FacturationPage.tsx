import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

export default function FacturationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const MENU_ITEMS = [
    { title: t("billing.billing"), desc: t("billing.billingDesc") },
    { title: t("billing.paymentStatus"), desc: t("billing.paymentStatusDesc") },
    { title: t("billing.collection"), desc: t("billing.collectionDesc") },
    { title: t("billing.paymentSecurity"), desc: t("billing.paymentSecurityDesc") },
    { title: t("billing.subscriptions"), desc: t("billing.subscriptionsDesc") },
    { title: t("billing.refunds"), desc: t("billing.refundsDesc") },
    { title: t("billing.pricing"), desc: t("billing.pricingDesc") },
  ];

  return (
    <div className="page-shell">
      <header className="page-header-soft">
        <div className="page-content">
          <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-card/80 backdrop-blur shadow-soft hover:bg-card transition" aria-label={t("common.back")}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{t("billing.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2">Gérer la facturation et les paiements</p>
        </div>
      </header>

      <main className="page-content pt-6 space-y-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.title}
            className="card-future w-full text-left hover:shadow-elevated transition-all hover:-translate-y-0.5"
          >
            <p className="font-bold text-foreground text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
          </button>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
