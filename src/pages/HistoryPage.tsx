import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Truck } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type HistoryType = "voyageur" | "coly" | "needit";

const MOCK_DATA: Record<HistoryType, { id: string; type: string; ref: string; amount: number; date: string }[]> = {
  voyageur: [
    { id: "1", type: "Transport", ref: "COLY N°224513", amount: 12.9, date: "30/01/2025" },
    { id: "2", type: "Transport", ref: "Needit N°142565", amount: 40.9, date: "12/01/2025" },
    { id: "3", type: "Transport", ref: "COLY N°244365", amount: 9.2, date: "04/01/2025" },
    { id: "4", type: "Transport", ref: "COLY N°263214", amount: 13.0, date: "03/01/2025" },
  ],
  coly: [
    { id: "1", type: "Transport", ref: "COLY N°224513", amount: 12.9, date: "30/01/2025" },
    { id: "2", type: "Transport", ref: "COLY N°244365", amount: 9.2, date: "04/01/2025" },
    { id: "3", type: "Transport", ref: "COLY N°263214", amount: 13.0, date: "03/01/2025" },
  ],
  needit: [
    { id: "1", type: "Transport", ref: "Needit N°142565", amount: 40.9, date: "12/01/2025" },
  ],
};

const TITLES: Record<HistoryType, string> = {
  voyageur: "Historique Voyageur",
  coly: "Historique Coly",
  needit: "Historique Needit",
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const historyType = (type as HistoryType) || "voyageur";

  const [search, setSearch] = useState("");
  const [year] = useState("2025");
  const [month] = useState("Janvier");

  const items = MOCK_DATA[historyType] || [];
  const filtered = items.filter(
    (i) =>
      !search ||
      i.ref.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase())
  );
  const total = filtered.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/voyageur-settings")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {TITLES[historyType]}
        </h1>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-4">
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Search here..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="text-muted-foreground" />
        </div>

        {/* Date filters */}
        <div className="space-y-1 mb-4">
          <p className="text-sm text-muted-foreground">
            ANNÉE : <span className="text-foreground font-medium">{year}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            MOIS : <span className="text-foreground font-medium ml-4">{month}</span>
          </p>
        </div>

        {/* Total */}
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-foreground">
            TOTAL + {total.toFixed(2)}€
          </p>
          <p className="text-sm text-muted-foreground">{month} {year}</p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Truck size={22} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{item.type}</p>
                  <p className="text-xs text-muted-foreground">{item.ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground text-sm">+{item.amount.toFixed(1)}€</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
