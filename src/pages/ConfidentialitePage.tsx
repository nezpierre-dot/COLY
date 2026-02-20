import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";

const CATEGORIES = [
  {
    name: "Marketing",
    enabled: true,
    desc: "Ces technologies sont utilisées par les annonceurs pour diffuser des publicités qui correspondent à vos intérêts.",
  },
  {
    name: "Fonctionnel",
    enabled: false,
    desc: "Ces technologies nous permettent d'analyser le comportement d'utilisation afin de mesurer et d'améliorer les performances.",
  },
  {
    name: "Essentiel",
    enabled: true,
    desc: "Ces technologies sont nécessaires pour activer les fonctionnalités de base de notre service.",
  },
];

const SERVICES = [
  { name: "Adjust", category: "Marketing", enabled: true },
  { name: "Sendbird", category: "Essentiel", enabled: true },
  { name: "Google Analytics for Firebase", category: "Marketing", enabled: false },
  { name: "Google Maps", category: "Essentiel", enabled: true },
];

export default function ConfidentialitePage() {
  const navigate = useNavigate();
  const [receiveOffers, setReceiveOffers] = useState(true);
  const [categories, setCategories] = useState(CATEGORIES);
  const [services, setServices] = useState(SERVICES);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const toggleCategory = (name: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.name === name ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const toggleService = (name: string) => {
    setServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-6">Mon Compte</h1>

        {/* Section header */}
        <div className="w-full py-4 rounded-2xl bg-coly-purple/20 text-center mb-6">
          <span className="text-lg font-bold text-foreground">Confidentialité</span>
        </div>

        {/* Annonces personnalisés */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-2">Annonces personnalisés</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Vos données nous aident à nous améliorer et, lorsque l'option est activée, elle permet de vous montrer des offres et promotions pertinentes.
          </p>
          <div className="rounded-2xl bg-coly-purple/10 border border-coly-purple/20 p-4 mb-4">
            <p className="text-sm text-foreground/80">
              Coly peut partager les données des utilisateurs (comme leur adresse e-mail, leur numéro de téléphone ou l'identifiant de leur appareil) avec la SNCF ou d'autres plateformes de ce type, afin de personnaliser les publicités et le contenu, d'évaluer les publicités et de créer des audiences. Vous pouvez vous désengager à tout moment de ces communications.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-foreground">Recevoir les offres<br />et promotions</p>
            <Switch checked={receiveOffers} onCheckedChange={setReceiveOffers} />
          </div>
        </section>

        {/* Politique de Confidentialité */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Politique de Confidentialité</h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>Date de mise à jour : 20/02/2026</p>
            <p>
              La présente politique de confidentialité décrit la manière dont Coly (ci-après "nous", "notre" ou "l'application") collecte, utilise, protège et partage les informations personnelles des utilisateurs (ci-après "vous" ou "utilisateur"). Cette politique s'applique à toutes les informations collectées lors de l'utilisation de notre application, que ce soit via un appareil mobile, un site web ou tout autre support.
            </p>
            <p className="font-semibold text-foreground">1. Informations collectées</p>
            <p>
              Nous collectons des informations personnelles lorsque vous vous inscrivez sur l'application, lorsque vous utilisez nos services ou lorsque vous nous contactez. Les informations suivantes peuvent être collectées :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Informations d'identification : Nom, prénom, adresse email, numéro de téléphone, photo de profil, etc.</li>
              <li>Informations de paiement : Détails de votre carte bancaire ou autres informations de paiement nécessaires pour effectuer des transactions.</li>
            </ul>
          </div>
        </section>

        {/* Paramètres de confidentialité */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-2">Paramètres de confidentialité</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cet outil vous aide à gérer le consentement à la collecte et au traitement de données personnelles par des technologies tierces.
          </p>

          <Tabs defaultValue="categories">
            <TabsList className="w-full bg-transparent border-b border-border rounded-none p-0 h-auto">
              <TabsTrigger
                value="categories"
                className="flex-1 rounded-none border-b-2 border-transparent py-3 text-sm font-semibold data-[state=active]:border-green-500 data-[state=active]:text-green-600 data-[state=active]:shadow-none"
              >
                Catégories
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="flex-1 rounded-none border-b-2 border-transparent py-3 text-sm font-semibold data-[state=active]:border-green-500 data-[state=active]:text-green-600 data-[state=active]:shadow-none"
              >
                Services
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="mt-4">
              <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {categories.map((cat) => (
                  <div key={cat.name} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground text-sm">{cat.name}</p>
                      <div className="flex items-center gap-2">
                        <Switch checked={cat.enabled} onCheckedChange={() => toggleCategory(cat.name)} />
                        <button onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}>
                          <ChevronDown size={18} className={`text-muted-foreground transition-transform ${expandedCat === cat.name ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>
                    {expandedCat === cat.name && (
                      <p className="text-xs text-muted-foreground mt-2">{cat.desc}</p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-4">
              <div className="border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {services.map((svc) => (
                  <div key={svc.name} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.category}</p>
                    </div>
                    <Switch checked={svc.enabled} onCheckedChange={() => toggleService(svc.name)} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button className="flex-1 py-3 rounded-2xl bg-accent/80 text-accent-foreground font-bold text-sm hover:opacity-90 transition-opacity">
              Refuser
            </button>
            <button className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Accepter tout
            </button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">Enregistrer les réglages</p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
