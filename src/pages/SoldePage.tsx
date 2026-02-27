import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingBag, ArrowDownCircle, Truck, ArrowUpCircle, ChevronDown, ChevronUp, Shield, CreditCard } from "lucide-react";
import { CommissionBreakdown } from "@/pages/PaymentMethods";
import BottomNav from "@/components/BottomNav";

const MOCK_TRANSACTIONS = [
  { id: "1", type: "Mission NeedIt", ref: "N°224513", amount: 32.9, date: "30/01/2025", direction: "in" as const, icon: "needit" },
  { id: "2", type: "Réception", ref: "virement solde", amount: -500, date: "12/01/2025", direction: "out" as const, icon: "reception" },
  { id: "3", type: "Transport", ref: "COLY N°244365", amount: 14.2, date: "04/01/2025", direction: "in" as const, icon: "transport" },
  { id: "4", type: "Envoi", ref: "COLY N°263214", amount: -23.0, date: "03/01/2025", direction: "out" as const, icon: "envoi" },
  { id: "5", type: "Envoi", ref: "COLY N°246531", amount: -44.4, date: "27/12/2024", direction: "out" as const, icon: "envoi" },
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
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currencySymbol = (() => { try { const s = localStorage.getItem("preferred-currency"); const m: Record<string,string> = {EUR:"€",USD:"$",GBP:"£",CAD:"CA$",CHF:"CHF",XOF:"CFA",XAF:"CFA",MAD:"MAD",TND:"TND",DZD:"DZD"}; if(s&&m[s]) return m[s]; } catch{} return "€"; })();

  const balance = MOCK_TRANSACTIONS.reduce((s, t) => s + t.amount, 0);
  const filtered = MOCK_TRANSACTIONS.filter(
    (t) =>
      !search ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      t.ref.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="px-6 pt-12" id="main-content" role="main" aria-label="Solde et transactions">
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-6" aria-label="Retour">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>

        {/* Balance */}
        <h1 className="text-[28px] font-black text-foreground leading-tight">SOLDE</h1>
        <p className="text-sm text-muted-foreground mt-1">au 03/02/2025 à 15h02</p>
        <p className={`text-4xl font-black mt-3 ${balance >= 0 ? "text-foreground" : "text-destructive"}`} aria-label={`Solde: ${balance.toFixed(2)} ${currencySymbol}`}>
          {balance >= 0 ? "+" : ""} {balance.toFixed(2)}{currencySymbol}
        </p>

        {/* Quick actions */}
        <div className="flex gap-2 mt-5 mb-8">
          <button onClick={() => navigate("/payment-methods")}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors">
            <CreditCard size={16} aria-hidden="true" /> Moyens de paiement
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-4">
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Rechercher une transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une transaction"
          />
          <Search size={18} className="text-muted-foreground" aria-hidden="true" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-3">Transactions</h2>

        {/* Transactions */}
        <ul className="space-y-3" role="list" aria-label="Liste des transactions">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="w-full flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:shadow-sm transition-shadow"
                aria-expanded={expandedId === t.id}
                aria-label={`${t.type} ${t.ref}, ${t.amount >= 0 ? "+" : ""}${t.amount.toFixed(1)} euros`}
              >
                <div className={`w-12 h-12 rounded-xl ${iconBgMap[t.icon]} flex items-center justify-center shrink-0`} aria-hidden="true">
                  {iconMap[t.icon]}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-foreground text-base">{t.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${t.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount.toFixed(1)}{currencySymbol}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
                {t.amount > 0 && (
                  expandedId === t.id
                    ? <ChevronUp size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                    : <ChevronDown size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                )}
              </button>
              {/* Commission breakdown for gains */}
              {expandedId === t.id && t.amount > 0 && (
                <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                  <CommissionBreakdown amount={t.amount} showFull />
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Footer security */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield size={14} aria-hidden="true" />
          <span>Transactions protégées · Sécurisé AXA</span>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
