import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ShoppingBag, Shield, CreditCard, ArrowRight, X, Send, MapPin, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DemandeurOnboardingProps {
  onComplete: () => void;
}

const DemandeurOnboarding = ({ onComplete }: DemandeurOnboardingProps) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleFinish = () => {
    localStorage.setItem("demandeur-onboarding-done", "1");
    onComplete();
  };

  const steps = [
    {
      icon: <Package size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-primary/70",
      title: "Bienvenue sur Nidit ! 📦",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Envoyez des <strong>colis</strong> avec des voyageurs de confiance ou faites <strong>acheter des produits</strong> introuvables chez vous grâce à NeedIt.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <Send size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">Envoyer</p>
              <p className="text-[10px] text-muted-foreground">Un colis via un voyageur</p>
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-center">
              <ShoppingBag size={20} className="text-secondary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">NeedIt</p>
              <p className="text-[10px] text-muted-foreground">Un produit à l'étranger</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Send size={36} className="text-primary-foreground" />,
      gradient: "from-secondary to-secondary/70",
      title: "Envoyer un colis 📬",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            En <strong>4 étapes simples</strong>, confiez votre colis à un voyageur vérifié :
          </p>
          <div className="space-y-2 mt-3">
            {[
              { num: "1", text: "Décrivez votre colis (taille, poids, photo)" },
              { num: "2", text: "Indiquez la destination et le prix" },
              { num: "3", text: "Un voyageur accepte votre demande" },
              { num: "4", text: "Confirmez la livraison avec un code" },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0">
                  {item.num}
                </span>
                <p className="text-xs font-medium text-foreground text-left">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <ShoppingBag size={36} className="text-primary-foreground" />,
      gradient: "from-warning to-warning/70",
      title: "Missions NeedIt 🛒",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Besoin d'un produit introuvable ? Créez une <strong>mission NeedIt</strong> et un voyageur l'achètera pour vous :
          </p>
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "🔍", text: "Décrivez le produit ou scannez son code-barres" },
              { emoji: "🌍", text: "Indiquez le pays et la ville d'achat" },
              { emoji: "💰", text: "Fixez un budget maximum" },
              { emoji: "🤝", text: "Un voyageur accepte et achète pour vous" },
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
      icon: <Shield size={36} className="text-primary-foreground" />,
      gradient: "from-accent to-accent/70",
      title: "Sécurité & paiement 🔒",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vos transactions sont <strong>100% sécurisées</strong> grâce au paiement séquestre :
          </p>
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "🔐", text: "Le paiement est bloqué jusqu'à confirmation de livraison" },
              { emoji: "📸", text: "Preuves photo obligatoires au ramassage et à la livraison" },
              { emoji: "🔔", text: "Notifications en temps réel à chaque étape" },
              { emoji: "⚖️", text: "Système de litiges en cas de problème" },
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
      icon: <MapPin size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-secondary/70",
      title: "C'est parti ! 🚀",
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous êtes prêt à utiliser Nidit. Que souhaitez-vous faire ?
          </p>
          <div className="space-y-2 mt-3">
            {[
              { num: "📦", text: "Envoyer un colis via un voyageur" },
              { num: "🛒", text: "Créer une mission NeedIt" },
              { num: "📊", text: "Explorer le dashboard" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <span className="text-lg shrink-0">{item.num}</span>
                <p className="text-sm font-medium text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      <button
        onClick={handleFinish}
        className="absolute top-5 right-5 z-10 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        Passer <X size={14} />
      </button>

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
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center shadow-lg`}>
                {currentStep.icon}
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground text-center mb-4">
              {currentStep.title}
            </h2>
            {currentStep.content}
          </motion.div>
        </AnimatePresence>
      </div>

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

      <div className="px-6 pb-8 space-y-2">
        {isLast ? (
          <>
            <button
              onClick={() => { handleFinish(); navigate("/send-coly"); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Package size={18} /> Envoyer un colis
            </button>
            <button
              onClick={() => { handleFinish(); navigate("/needit-mission"); }}
              className="w-full py-3.5 rounded-2xl border border-secondary/30 bg-secondary/5 text-foreground text-sm font-medium hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} /> Créer une mission NeedIt
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-2xl text-muted-foreground text-sm hover:text-foreground transition-colors"
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

export default DemandeurOnboarding;
