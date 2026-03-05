import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

const VoyageurSettings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const menuItems = [
    { label: t("voySettings.dashboardHistory"), path: "/history/all" },
    { label: t("voySettings.travelerHistory"), path: "/history/voyageur" },
    { label: t("voySettings.colyHistory"), path: "/history/coly" },
    { label: t("voySettings.needitHistory"), path: "/history/needit" },
    { label: t("voySettings.favoriteTrips"), path: "/favorites" },
  ];

  const menuItems2 = [
    { label: t("voySettings.budgetBalance"), path: "" },
    { label: t("voySettings.customsInfo"), path: "" },
  ];

  const Section = ({ items }: { items: typeof menuItems }) => (
    <div className="bg-card rounded-2xl border border-border divide-y divide-border">
      {items.map((item, i) => (
        <button key={i} onClick={() => item.path && navigate(item.path)} className="w-full text-center py-5 text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors whitespace-pre-line">{item.label}</button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4"><ArrowLeft size={24} /></button>
        <h1 className="text-3xl font-bold text-foreground mb-6">{t("voySettings.title")}</h1>
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
