import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plane, Package, Shield, Settings, ArrowRight, X, SlidersHorizontal, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VoyageurOnboardingProps {
  onComplete: () => void;
}

const CUTOFF_OPTIONS = [
  { value: "6", label: "6h", desc: "Dernière minute" },
  { value: "12", label: "12h", desc: "Demi-journée" },
  { value: "24", label: "24h", desc: "Recommandé" },
  { value: "48", label: "48h", desc: "Confortable" },
  { value: "72", label: "72h", desc: "Très anticipé" },
];

const VoyageurOnboarding = ({ onComplete }: VoyageurOnboardingProps) => {
  const [step, setStep] = useState(0);
  const [selectedCutoff, setSelectedCutoff] = useState("24");
  const navigate = useNavigate();

  const handleFinish = () => {
    localStorage.setItem("voyageur-onboarding-done", "1");
    localStorage.setItem("voyageur-preferred-cutoff", selectedCutoff);
    onComplete();
  };

  const steps = [
    {
      icon: <Plane size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-primary/70",
      title: "Bienvenue voyageur ! ✈️",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            En tant que voyageur, vous pouvez <strong>transporter des colis</strong> et <strong>acheter des produits</strong> pour les demandeurs sur votre trajet.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <Package size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">Transporter</p>
              <p className="text-[10px] text-muted-foreground">Colis & achats</p>
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-center">
              <Shield size={20} className="text-secondary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">Sécurisé</p>
              <p className="text-[10px] text-muted-foreground">Paiement séquestre</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Clock size={36} className="text-primary-foreground" />,
      gradient: "from-warning to-warning/70",
      title: "Délai de clôture ⏰",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le <strong>délai de clôture (cutoff)</strong> ferme automatiquement votre voyage aux nouveaux matchs avant le départ. Choisissez le délai qui vous convient :
          </p>
          <div className="space-y-1.5 mt-3">
            {CUTOFF_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedCutoff(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  selectedCutoff === opt.value
                    ? "bg-primary/10 border-primary/40 ring-2 ring-primary/20"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${selectedCutoff === opt.value ? "text-primary" : "text-foreground"}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
                {opt.value === "24" && (
                  <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    Par défaut
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            💡 Vous pourrez modifier ce réglage à tout moment depuis la page détail d'un voyage.
          </p>
        </div>
      ),
    },
    {
      icon: <Bell size={36} className="text-primary-foreground" />,
      gradient: "from-accent to-accent/70",
      title: "Notifications & alertes 🔔",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous recevrez des <strong>notifications automatiques</strong> :
          </p>
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "⚡", text: "Quand un colis correspond à votre trajet" },
              { emoji: "⏰", text: "Quand votre voyage approche de la clôture" },
              { emoji: "✅", text: "Quand un demandeur confirme la livraison" },
              { emoji: "📧", text: "Un email de rappel avant la fermeture" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{item.emoji}</span>
                <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <SlidersHorizontal size={36} className="text-primary-foreground" />,
      gradient: "from-secondary to-secondary/70",
      title: "Prêt à voyager ! 🚀",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Votre configuration est prête. Voici les prochaines étapes :
          </p>
          <div className="space-y-2 mt-3">
            {[
              { num: "1", text: "Publiez votre premier voyage", action: "/new-trip" },
              { num: "2", text: "Consultez les colis en attente", action: null },
              { num: "3", text: "Acceptez un match et commencez", action: null },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {item.num}
                </span>
                <p className="text-sm font-medium text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cutoff sélectionné : <strong>{selectedCutoff}h</strong> avant le départ
          </p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Skip */}
      <button
        onClick={handleFinish}
        className="absolute top-5 right-5 z-10 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        Passer <X size={14} />
      </button>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-sm w-full"
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center shadow-lg`}>
                {currentStep.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground text-center mb-4">
              {currentStep.title}
            </h2>

            {/* Step content */}
            {currentStep.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 space-y-2">
        {isLast ? (
          <>
            <button
              onClick={() => { handleFinish(); navigate("/new-trip"); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Plane size={18} /> Publier mon premier voyage
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Explorer le dashboard
            </button>
          </>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            Suivant <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoyageurOnboarding;
