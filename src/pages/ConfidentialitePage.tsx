import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ShieldCheck, Lock, Eye, EyeOff, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

const CATEGORIES = [
  { name: "Marketing", enabled: true, desc: "Ces technologies sont utilisées par les annonceurs pour diffuser des publicités qui correspondent à vos intérêts." },
  { name: "Fonctionnel", enabled: false, desc: "Ces technologies nous permettent d'analyser le comportement d'utilisation afin de mesurer et d'améliorer les performances." },
  { name: "Essentiel", enabled: true, desc: "Ces technologies sont nécessaires pour activer les fonctionnalités de base de notre service." },
];

const SERVICES = [
  { name: "Adjust", category: "Marketing", enabled: true },
  { name: "Sendbird", category: "Essentiel", enabled: true },
  { name: "Google Analytics for Firebase", category: "Marketing", enabled: false },
  { name: "Google Maps", category: "Essentiel", enabled: true },
];

const POLICY_SECTIONS = [
  { title: "1. Informations collectées", content: "Nous collectons des informations personnelles lorsque vous vous inscrivez sur l'application, lorsque vous utilisez nos services ou lorsque vous nous contactez." },
  { title: "2. Utilisation des données", content: "Vos données sont utilisées pour fournir et améliorer nos services, personnaliser votre expérience, communiquer avec vous, et assurer la sécurité de votre compte." },
  { title: "3. Partage des données", content: "Vos données ne sont jamais vendues. Elles peuvent être partagées avec nos partenaires de confiance uniquement dans le cadre de la prestation de service." },
  { title: "4. Vos droits", content: "Conformément au RGPD, vous disposez de droits d'accès, de rectification, de suppression et de portabilité de vos données." },
];

export default function ConfidentialitePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [receiveOffers, setReceiveOffers] = useState(true);
  const [categories, setCategories] = useState(CATEGORIES);
  const [services, setServices] = useState(SERVICES);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);

  const toggleCategory = (name: string) => setCategories((prev) => prev.map((c) => (c.name === name ? { ...c, enabled: !c.enabled } : c)));
  const toggleService = (name: string) => setServices((prev) => prev.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s)));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary px-6 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-8 right-0 w-28 h-28 rounded-full bg-primary-foreground/5" />
        <div className="relative z-10">
          <button onClick={() => navigate("/my-account")} className="text-primary-foreground/70 mb-3"><ArrowLeft size={22} /></button>
          <h1 className="text-2xl font-bold text-primary-foreground">{t("privacy.title")}</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">{t("privacy.subtitle")}</p>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0"><ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("privacy.protectedByAxa")}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("privacy.encryption")}</p>
          </div>
          <Lock size={14} className="text-emerald-500 shrink-0" />
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Eye size={16} className="text-primary" /> {t("privacy.personalizedAds")}</h2>
          <p className="text-xs text-muted-foreground">{t("privacy.personalizedAdsDesc")}</p>
          <div className="flex items-center justify-between bg-background rounded-xl px-4 py-3 border border-border">
            <span className="text-sm font-medium text-foreground">{t("privacy.receiveOffers")}</span>
            <Switch checked={receiveOffers} onCheckedChange={setReceiveOffers} />
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl overflow-hidden">
          <button onClick={() => setShowPolicy(!showPolicy)} className="w-full flex items-center justify-between px-4 py-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={16} className="text-primary" /> {t("privacy.privacyPolicy")}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">20/02/2026</span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showPolicy ? "rotate-180" : ""}`} />
            </div>
          </button>
          {showPolicy && (
            <div className="px-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {POLICY_SECTIONS.map((section) => (
                <div key={section.title} className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedPolicy(expandedPolicy === section.title ? null : section.title)} className="w-full flex items-center justify-between px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-foreground">{section.title}</span>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expandedPolicy === section.title ? "rotate-180" : ""}`} />
                  </button>
                  {expandedPolicy === section.title && <p className="text-xs text-muted-foreground px-3 pb-3 animate-in fade-in duration-200">{section.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 px-1"><EyeOff size={16} className="text-primary" /> {t("privacy.consentSettings")}</h2>
          <p className="text-xs text-muted-foreground px-1">{t("privacy.consentDesc")}</p>
          <Tabs defaultValue="categories">
            <TabsList className="w-full bg-muted/50 rounded-xl p-1 h-auto">
              <TabsTrigger value="categories" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">{t("privacy.categories")}</TabsTrigger>
              <TabsTrigger value="services" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">{t("privacy.services")}</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-3">
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.name} className="bg-muted/50 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <Switch checked={cat.enabled} onCheckedChange={() => toggleCategory(cat.name)} />
                        <button onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}><ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedCat === cat.name ? "rotate-180" : ""}`} /></button>
                      </div>
                    </div>
                    {expandedCat === cat.name && <p className="text-xs text-muted-foreground px-4 pb-3 animate-in fade-in duration-200">{cat.desc}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="services" className="mt-3">
              <div className="space-y-2">
                {services.map((svc) => (
                  <div key={svc.name} className="bg-muted/50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div><p className="text-sm font-medium text-foreground">{svc.name}</p><p className="text-xs text-muted-foreground">{svc.category}</p></div>
                    <Switch checked={svc.enabled} onCheckedChange={() => toggleService(svc.name)} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">{t("privacy.rejectAll")}</button>
            <button className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">{t("privacy.acceptAll")}</button>
          </div>
          <button className="w-full text-center text-xs text-primary font-medium py-2 hover:underline">{t("privacy.saveSettings")}</button>
        </div>

        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Protégé par AXA • Chiffrement AES-256 • RGPD</span>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
