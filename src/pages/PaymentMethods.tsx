import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Building2, Smartphone, Check, Plus, Shield, ChevronRight, Wallet, Apple, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import { useTranslation } from "@/hooks/useTranslation";

interface PaymentMethod {
  id: string;
  type: "card" | "rib" | "apple_pay" | "google_pay";
  label: string;
  detail: string;
  isDefault: boolean;
}

const MOCK_METHODS: PaymentMethod[] = [
  { id: "1", type: "card", label: "Visa •••• 4242", detail: "Exp. 12/27", isDefault: true },
  { id: "2", type: "rib", label: "IBAN •••• FR76 3000", detail: "BNP Paribas", isDefault: false },
];

const typeIcons: Record<string, React.ReactNode> = {
  card: <CreditCard size={20} className="text-primary" />,
  rib: <Building2 size={20} className="text-secondary" />,
  apple_pay: <Apple size={20} className="text-foreground" />,
  google_pay: <Wallet size={20} className="text-accent" />,
};

const typeBg: Record<string, string> = {
  card: "bg-primary/10",
  rib: "bg-secondary/10",
  apple_pay: "bg-muted",
  google_pay: "bg-accent/10",
};

// Commission breakdown component
export const CommissionBreakdown = ({ amount, showFull = false }: { amount: number; showFull?: boolean }) => {
  const { t } = useTranslation();
  const commission = amount * 0.18;
  const assurance = amount * 0.02;
  const net = amount - commission - assurance;

  return (
    <div className="bg-muted/50 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Info size={14} className="text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-semibold text-muted-foreground uppercase">{t("payment.feeDetails")}</p>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("payment.grossAmount")}</span>
        <span className="font-semibold text-foreground">{amount.toFixed(2)}{getCurrencySymbol()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("payment.commission")}</span>
        <span className="font-semibold text-destructive">-{commission.toFixed(2)}{getCurrencySymbol()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("payment.insuranceAxa")}</span>
        <span className="font-semibold text-destructive">-{assurance.toFixed(2)}{getCurrencySymbol()}</span>
      </div>
      <div className="border-t border-border pt-2 flex justify-between text-sm">
        <span className="font-bold text-foreground">{t("payment.netAmount")}</span>
        <span className="font-black text-primary">{net.toFixed(2)}{getCurrencySymbol()}</span>
      </div>
      {showFull && (
        <p className="text-xs text-muted-foreground mt-1">
          <Shield size={10} className="inline mr-1" aria-hidden="true" />
          {t("payment.securedAxa")}
        </p>
      )}
    </div>
  );
};

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [methods, setMethods] = useState(MOCK_METHODS);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const setDefault = (id: string) => {
    setMethods(methods.map(m => ({ ...m, isDefault: m.id === id })));
  };

  const wallets = [
    { key: "apple_pay", label: "Apple Pay", icon: <Apple size={20} />, available: true },
    { key: "google_pay", label: "Google Pay", icon: <Wallet size={20} />, available: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="px-6 pt-12" id="main-content" role="main" aria-label={t("payment.title")}>
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4" aria-label={t("common.back")}><ArrowLeft size={24} aria-hidden="true" /></button>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("payment.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("payment.subtitle")}</p>

        <section aria-label={t("payment.cardsRib")} className="space-y-3 mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("payment.cardsRib")}</h2>
          {methods.map((m) => (
            <button key={m.id} onClick={() => setDefault(m.id)} className={`w-full flex items-center gap-4 rounded-2xl border p-4 transition-all ${m.isDefault ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/30"}`}>
              <div className={`w-12 h-12 rounded-xl ${typeBg[m.type]} flex items-center justify-center shrink-0`}>{typeIcons[m.type]}</div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.detail}</p>
              </div>
              {m.isDefault && (
                <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <Check size={12} aria-hidden="true" /> {t("payment.default")}
                </span>
              )}
              <ChevronRight size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
            </button>
          ))}
        </section>

        <section aria-label={t("payment.digitalWallets")} className="space-y-3 mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("payment.digitalWallets")}</h2>
          {wallets.map((w) => (
            <div key={w.key} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className={`w-12 h-12 rounded-xl ${typeBg[w.key]} flex items-center justify-center shrink-0`}>{w.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{w.label}</p>
                <p className="text-xs text-muted-foreground">{t("payment.quickSecure")}</p>
              </div>
              <button className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">{t("payment.activate")}</button>
            </div>
          ))}
        </section>

        <section aria-label={t("payment.pricingTransparency")} className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("payment.pricingTransparency")}</h2>
          <CommissionBreakdown amount={50} showFull />
        </section>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium">
              <Plus size={18} aria-hidden="true" /> {t("payment.addMethod")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{t("payment.addTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              {[
                { icon: <CreditCard size={20} />, label: t("payment.bankCard"), desc: t("payment.bankCardDesc") },
                { icon: <Building2 size={20} />, label: t("payment.ribIban"), desc: t("payment.ribIbanDesc") },
                { icon: <Apple size={20} />, label: "Apple Pay", desc: t("payment.applePayDesc") },
                { icon: <Wallet size={20} />, label: "Google Pay", desc: t("payment.googlePayDesc") },
              ].map((opt) => (
                <button key={opt.label} onClick={() => setAddDialogOpen(false)} className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-foreground">{opt.icon}</div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield size={14} aria-hidden="true" />
          <span>{t("payment.securityBadge")}</span>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
