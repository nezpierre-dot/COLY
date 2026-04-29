import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingBag, ArrowDownCircle, Truck, ArrowUpCircle, ChevronDown, ChevronUp, Shield, CreditCard } from "lucide-react";
import { CommissionBreakdown } from "@/features/account/pages/PaymentMethods";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";
import CoachMarks, { walletCoachSteps } from "@/components/CoachMarks";

const MOCK_TRANSACTIONS = [
  { id: "1", type: "Mission NeedIt", ref: "N°224513", amount: 32.9, date: "30/01/2025", direction: "in" as const, icon: "needit" },
  { id: "2", type: "Réception", ref: "virement solde", amount: -500, date: "12/01/2025", direction: "out" as const, icon: "reception" },
  { id: "3", type: "Transport", ref: "NIDIT N°244365", amount: 14.2, date: "04/01/2025", direction: "in" as const, icon: "transport" },
  { id: "4", type: "Envoi", ref: "NIDIT N°263214", amount: -23.0, date: "03/01/2025", direction: "out" as const, icon: "envoi" },
  { id: "5", type: "Envoi", ref: "NIDIT N°246531", amount: -44.4, date: "27/12/2024", direction: "out" as const, icon: "envoi" },
  { id: "6", type: "Réception", ref: "virement solde", amount: -50, date: "15/12/2024", direction: "out" as const, icon: "reception" },
];

const iconMap: Record<string, React.ReactNode> = {
  needit: <ShoppingBag size={20} className="text-accent" />,
  reception: <ArrowDownCircle size={20} className="text-primary" />,
  transport: <Truck size={20} className="text-secondary" />,
  envoi: <ArrowUpCircle size={20} className="text-muted-foreground" />,
};

const iconBgMap: Record<string, string> = {
  needit: "bg-accent/10",
  reception: "bg-primary/10",
  transport: "bg-secondary/10",
  envoi: "bg-muted",
};

export default function SoldePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currencySymbol = (() => { try { const s = localStorage.getItem("preferred-currency"); const m: Record<string,string> = {EUR:"€",USD:"$",GBP:"£",CAD:"CA$",CHF:"CHF",XOF:"CFA",XAF:"CFA",MAD:"MAD",TND:"TND",DZD:"DZD"}; if(s&&m[s]) return m[s]; } catch{} return "€"; })();

  const balance = MOCK_TRANSACTIONS.reduce((s, tx) => s + tx.amount, 0);
  const filtered = MOCK_TRANSACTIONS.filter((tx) => !search || tx.type.toLowerCase().includes(search.toLowerCase()) || tx.ref.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-shell">
      <div className="page-header-soft flex items-center gap-3">
        <button onClick={() => navigate("/comptabilite")} className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center shadow-soft" aria-label={t("common.back")}>
          <ArrowLeft size={18} className="text-foreground" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground leading-tight tracking-tight">{t("balance.title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">au 03/02/2025 à 15h02</p>
        </div>
      </div>

      <main className="page-content pt-5" id="main-content" role="main" aria-label={t("balance.title")}>
        <div className="card-future text-center mb-5" data-coach="wallet-balance">
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Solde disponible</p>
          <p className={`text-4xl font-black ${balance >= 0 ? "text-success" : "text-destructive"}`}>
            {balance >= 0 ? "+" : ""} {balance.toFixed(2)}{currencySymbol}
          </p>
        </div>

        <div className="flex gap-2 mt-5 mb-8">
          <button onClick={() => navigate("/payment-methods")} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors">
            <CreditCard size={16} aria-hidden="true" /> {t("balance.paymentMethods")}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-4">
          <input className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" placeholder={t("balance.searchTransaction")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("balance.searchTransaction")} />
          <Search size={18} className="text-muted-foreground" aria-hidden="true" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-3">{t("balance.transactions")}</h2>

        <ul className="space-y-3" role="list" data-coach="wallet-history">
          {filtered.map((tx) => (
            <li key={tx.id}>
              <button onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)} className="w-full flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:shadow-sm transition-shadow" aria-expanded={expandedId === tx.id}>
                <div className={`w-12 h-12 rounded-xl ${iconBgMap[tx.icon]} flex items-center justify-center shrink-0`} aria-hidden="true">{iconMap[tx.icon]}</div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-foreground text-base">{tx.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tx.ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${tx.amount >= 0 ? "text-primary" : "text-destructive"}`}>{tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(1)}{currencySymbol}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                {tx.amount > 0 && (expandedId === tx.id ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />)}
              </button>
              {expandedId === tx.id && tx.amount > 0 && (
                <div className="mt-2 animate-in slide-in-from-top-2 duration-200"><CommissionBreakdown amount={tx.amount} showFull /></div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield size={14} aria-hidden="true" />
          <span>{t("balance.securedTransactions")}</span>
        </div>
      </main>
      <BottomNav />
      <CoachMarks steps={walletCoachSteps} storageKey="coach.wallet.v1" delay={500} />
    </div>
  );
}
