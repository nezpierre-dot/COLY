import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, Clock, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface WalletCardProps {
  compact?: boolean;
}

const TOPUP_AMOUNTS = [5, 10, 20, 50, 100];

const WalletCard = ({ compact = false }: WalletCardProps) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupLoading, setTopupLoading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = getCurrencySymbol();

  useEffect(() => {
    if (!user) return;

    const loadWallet = async () => {
      let { data: wallet } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("wallets" as any)
          .insert({ user_id: user.id } as any)
          .select()
          .single();
        wallet = newWallet;
      }

      if (wallet) {
        setBalance((wallet as any).balance ?? 0);

        const { data: txns } = await supabase
          .from("wallet_transactions" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (txns) setTransactions(txns as any);
      }
      setLoading(false);
    };

    loadWallet();

    // Check for topup success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("topup") === "success") {
      const amount = params.get("amount");
      toast.success(`Wallet rechargé de ${amount}€ !`);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("topup");
      url.searchParams.delete("amount");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [user]);

  const handleTopup = async (amount: number) => {
    setTopupLoading(amount);
    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-topup", {
        body: { amount },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("Pas d'URL de paiement reçue");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la recharge");
    } finally {
      setTopupLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-2" />
        <div className="h-8 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Wallet size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Wallet Nidit</p>
          <p className={`text-xl font-black leading-tight ${(balance ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
            {(balance ?? 0).toFixed(2)}{currency}
          </p>
        </div>
        <TopupPicker
          loading={topupLoading}
          currency={currency}
          onPick={handleTopup}
        />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Balance header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet size={18} />
            <span className="text-sm font-semibold opacity-90">Wallet Nidit</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1 text-xs font-bold rounded-xl"
            onClick={() => setShowTopup(!showTopup)}
          >
            <Plus size={14} />
            Recharger
          </Button>
        </div>
        <p className="text-3xl font-black">
          {(balance ?? 0).toFixed(2)}<span className="text-lg ml-1 opacity-80">{currency}</span>
        </p>
      </div>

      {/* Top-up amounts */}
      <AnimatePresence>
        {showTopup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Choisir un montant</p>
              <div className="grid grid-cols-5 gap-2">
                {TOPUP_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    disabled={topupLoading !== null}
                    onClick={() => handleTopup(amt)}
                    className="h-10 font-bold text-sm rounded-xl border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {topupLoading === amt ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      `${amt}€`
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction history toggle */}
      <div className="p-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            Historique des transactions
          </span>
          <ChevronRight size={14} className={`transition-transform ${showHistory ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune transaction</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === "credit" ? "bg-primary/10" : "bg-destructive/10"
                      }`}>
                        {tx.type === "credit" ? (
                          <ArrowDownLeft size={14} className="text-primary" />
                        ) : (
                          <ArrowUpRight size={14} className="text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.description || (tx.type === "credit" ? "Crédit" : "Débit")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${tx.type === "credit" ? "text-primary" : "text-destructive"}`}>
                        {tx.type === "credit" ? "+" : "-"}{Math.abs(tx.amount).toFixed(2)}{currency}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─────────── Topup Picker (popover) ─────────── */
const QUICK_AMOUNTS = [10, 25, 50];

interface TopupPickerProps {
  loading: number | null;
  currency: string;
  onPick: (amount: number) => void;
}

const TopupPicker = ({ loading, currency, onPick }: TopupPickerProps) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<string>("");

  const customAmount = Number.parseFloat(custom.replace(",", "."));
  const customValid = !Number.isNaN(customAmount) && customAmount >= 1 && customAmount <= 1000;

  const choose = (amt: number) => {
    setOpen(false);
    onPick(amt);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          disabled={loading !== null}
          className="h-9 gap-1 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          aria-label="Choisir un montant à recharger"
        >
          {loading !== null ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <>
              <Plus size={13} />
              Recharger
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Choisir un montant
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {QUICK_AMOUNTS.map((amt) => (
            <Button
              key={amt}
              variant="outline"
              size="sm"
              onClick={() => choose(amt)}
              className="h-10 font-bold text-sm rounded-xl border-primary/25 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {amt}{currency}
            </Button>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Autre montant
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              max={1000}
              step={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="20"
              className="h-10 pr-8 text-sm font-semibold"
              aria-label="Montant personnalisé"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {currency}
            </span>
          </div>
          <Button
            size="sm"
            disabled={!customValid}
            onClick={() => customValid && choose(Math.round(customAmount * 100) / 100)}
            className="h-10 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            aria-label="Confirmer le montant personnalisé"
          >
            OK
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Min. 1{currency} — Max. 1 000{currency}
        </p>
      </PopoverContent>
    </Popover>
  );
};

