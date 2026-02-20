import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const menuItems = [
  { label: "Mon historique Voyageur", path: "/history/voyageur" },
  { label: "Mon historique Coly", path: "/history/coly" },
  { label: "Mon historique Needit", path: "/history/needit" },
  { label: "Mes Trajets Favoris", path: "" },
];

const menuItems2 = [
  { label: "Budget / Balance\nNeedit", path: "" },
  { label: "Information douanière", path: "" },
];

const VoyageurSettings = () => {
  const navigate = useNavigate();

  const Section = ({ items }: { items: typeof menuItems }) => (
    <div className="bg-card rounded-2xl border border-border divide-y divide-border">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => item.path && navigate(item.path)}
          className="w-full text-center py-5 text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors whitespace-pre-line"
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Mon Compte</h1>

        <div className="bg-secondary/30 rounded-2xl py-4 px-6 text-center mb-6">
          <h2 className="text-lg font-bold text-foreground">Réglages Voyageur</h2>
        </div>

        <div className="space-y-6">
          <Section items={menuItems} />
          <Section items={menuItems2} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default VoyageurSettings;
