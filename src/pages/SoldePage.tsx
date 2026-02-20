import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingBag, ArrowDownCircle, Truck, ArrowUpCircle } from "lucide-react";
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
  needit: <ShoppingBag size={20} className="text-muted-foreground" />,
  reception: <ArrowDownCircle size={20} className="text-green-600" />,
  transport: <Truck size={20} className="text-muted-foreground" />,
  envoi: <ArrowUpCircle size={20} className="text-muted-foreground" />,
};

const iconBgMap: Record<string, string> = {
  needit: "bg-muted",
  reception: "bg-green-100",
  transport: "bg-muted",
  envoi: "bg-muted",
};

export default function SoldePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const balance = MOCK_TRANSACTIONS.reduce((s, t) => s + t.amount, 0);
  const filtered = MOCK_TRANSACTIONS.filter(
    (t) =>
      !search ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      t.ref.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/comptabilite")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>

        {/* Balance */}
        <h1 className="text-3xl font-black text-foreground">SOLDE</h1>
        <p className="text-sm text-muted-foreground mt-1">au 03/02/2025 à 15h02</p>
        <p className={`text-4xl font-black mt-2 ${balance >= 0 ? "text-foreground" : "text-destructive"}`}>
          {balance >= 0 ? "+" : ""} {balance.toFixed(2)}€
        </p>

        {/* Search */}
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mt-6 mb-6">
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Search here..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="text-muted-foreground" />
        </div>

        {/* Transactions */}
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4">
              <div className={`w-12 h-12 rounded-xl ${iconBgMap[t.icon]} flex items-center justify-center shrink-0`}>
                {iconMap[t.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{t.type}</p>
                <p className="text-xs text-muted-foreground">{t.ref}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold text-sm ${t.amount >= 0 ? "text-foreground" : t.amount <= -100 ? "text-green-600" : "text-foreground"}`}>
                  {t.amount >= 0 ? "+" : ""}{t.amount.toFixed(1)}€
                </p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
