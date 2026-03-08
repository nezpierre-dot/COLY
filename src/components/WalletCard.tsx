import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencySymbol } from "@/hooks/useCurrencyPreference";
import { motion, AnimatePresence } from "framer-motion";

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

const WalletCard = ({ compact = false }: WalletCardProps) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const currency = getCurrencySymbol();

  useEffect(() => {
    if (!user) return;

    const loadWallet = async () => {
      // Get or create wallet
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

        // Load recent transactions
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
  }, [user]);

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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet Nidit</p>
          <p className={`text-xl font-black ${(balance ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
            {(balance ?? 0).toFixed(2)}{currency}
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Balance header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} />
          <span className="text-sm font-semibold opacity-90">Wallet Nidit</span>
        </div>
        <p className="text-3xl font-black">
          {(balance ?? 0).toFixed(2)}<span className="text-lg ml-1 opacity-80">{currency}</span>
        </p>
      </div>

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

export default WalletCard;
