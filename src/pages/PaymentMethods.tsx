import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Building2, Smartphone, Check, Plus, Shield, ChevronRight, Wallet, Apple, Info, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

interface StripePaymentMethod {
  id: string;
  type: "card" | "sepa_debit";
  brand: string;
  last4: string;
  exp_month?: number;
  exp_year?: number;
  wallet?: string | null;
  bank_code?: string;
  country?: string;
  is_default: boolean;
}

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

const typeIcons: Record<string, React.ReactNode> = {
  card: <CreditCard size={20} className="text-primary" />,
  sepa_debit: <Building2 size={20} className="text-secondary" />,
  apple_pay: <Apple size={20} className="text-foreground" />,
  google_pay: <Wallet size={20} className="text-accent" />,
};

const typeBg: Record<string, string> = {
  card: "bg-primary/10",
  sepa_debit: "bg-secondary/10",
  apple_pay: "bg-muted",
  google_pay: "bg-accent/10",
};

function getMethodLabel(m: StripePaymentMethod): string {
  if (m.type === "sepa_debit") return `IBAN •••• ${m.last4}`;
  if (m.wallet === "apple_pay") return `Apple Pay •••• ${m.last4}`;
  if (m.wallet === "google_pay") return `Google Pay •••• ${m.last4}`;
  return `${(m.brand || "Card").charAt(0).toUpperCase() + (m.brand || "card").slice(1)} •••• ${m.last4}`;
}

function getMethodDetail(m: StripePaymentMethod): string {
  if (m.type === "sepa_debit") return m.country ? `SEPA · ${m.country}` : "SEPA Direct Debit";
  if (m.exp_month && m.exp_year) return `Exp. ${String(m.exp_month).padStart(2, "0")}/${String(m.exp_year).slice(-2)}`;
  return "";
}

function getMethodDisplayType(m: StripePaymentMethod): string {
  if (m.wallet === "apple_pay") return "apple_pay";
  if (m.wallet === "google_pay") return "google_pay";
  return m.type;
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [methods, setMethods] = useState<StripePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingType, setAddingType] = useState<"card" | "rib" | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "list" },
      });
      if (error) throw error;
      setMethods(data.methods || []);
    } catch (err: any) {
      console.error("Failed to fetch payment methods:", err);
      toast.error("Impossible de charger les méthodes de paiement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "set-default", payment_method_id: id },
      });
      if (error) throw error;
      setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
      toast.success("Méthode par défaut mise à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDetach = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "detach", payment_method_id: id },
      });
      if (error) throw error;
      setMethods((prev) => prev.filter((m) => m.id !== id));
      toast.success("Méthode de paiement supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddMethod = async (type: "card" | "rib") => {
    setAddingType(type);
    setAddDialogOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "create-setup-intent" },
      });
      if (error) throw error;

      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripePublicKey) {
        toast.error("Configuration Stripe manquante");
        setAddingType(null);
        return;
      }

      const stripe = await loadStripe(stripePublicKey);
      if (!stripe) {
        toast.error("Impossible de charger Stripe");
        setAddingType(null);
        return;
      }

      // Use Stripe's confirmSetup with redirect to collect payment method details
      const origin = window.location.origin;
      const { error: confirmError } = await stripe.confirmSetup({
        clientSecret: data.client_secret,
        confirmParams: {
          return_url: `${origin}/payment-methods?setup_success=true`,
          payment_method_data: {
            billing_details: {},
          },
        },
      });

      if (confirmError) {
        toast.error(confirmError.message || "Erreur lors de l'ajout");
      }
    } catch (err: any) {
      console.error("Add method error:", err);
      toast.error("Erreur lors de l'ajout de la méthode");
    } finally {
      setAddingType(null);
    }
  };

  // Check for setup_success in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup_success") === "true") {
      toast.success("Méthode de paiement ajoutée avec succès !");
      // Clean URL
      window.history.replaceState({}, "", "/payment-methods");
      fetchMethods();
    }
  }, [fetchMethods]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="px-6 pt-12" id="main-content" role="main" aria-label={t("payment.title")}>
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4" aria-label={t("common.back")}>
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("payment.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("payment.subtitle")}</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <section aria-label={t("payment.cardsRib")} className="space-y-3 mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("payment.cardsRib")}
              </h2>
              {methods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucune méthode de paiement enregistrée
                </p>
              ) : (
                methods.map((m) => {
                  const displayType = getMethodDisplayType(m);
                  return (
                    <div
                      key={m.id}
                      className={`w-full flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                        m.is_default
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl ${typeBg[displayType] || "bg-muted"} flex items-center justify-center shrink-0`}>
                        {typeIcons[displayType] || <CreditCard size={20} className="text-primary" />}
                      </div>
                      <button onClick={() => handleSetDefault(m.id)} className="flex-1 text-left">
                        <p className="font-semibold text-foreground text-sm">{getMethodLabel(m)}</p>
                        <p className="text-xs text-muted-foreground">{getMethodDetail(m)}</p>
                      </button>
                      {m.is_default && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          <Check size={12} aria-hidden="true" /> {t("payment.default")}
                        </span>
                      )}
                      <button
                        onClick={() => handleDetach(m.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </section>

            <section aria-label={t("payment.pricingTransparency")} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("payment.pricingTransparency")}
              </h2>
              <CommissionBreakdown amount={50} showFull />
            </section>
          </>
        )}

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <button
              disabled={!!addingType}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium disabled:opacity-50"
            >
              {addingType ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
              {t("payment.addMethod")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("payment.addTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleAddMethod("card")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-foreground">
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">{t("payment.bankCard")}</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard, Apple Pay, Google Pay</p>
                </div>
              </button>
              <button
                onClick={() => handleAddMethod("rib")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-foreground">
                  <Building2 size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">{t("payment.ribIban")}</p>
                  <p className="text-xs text-muted-foreground">Prélèvement SEPA Direct Debit</p>
                </div>
              </button>
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
