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
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-8">{t("billing.title")}</h1>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button key={item.title} className="w-full rounded-2xl border border-border bg-card p-5 text-center hover:bg-muted/50 transition-colors">
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
