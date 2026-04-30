import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ShoppingBag, Shield, ArrowRight, X, Send, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlossaryButton from "@/components/GlossaryButton";
import { useTranslation } from "@/hooks/useTranslation";

interface DemandeurOnboardingProps {
  onComplete: () => void;
}

const DemandeurOnboarding = ({ onComplete }: DemandeurOnboardingProps) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleFinish = () => {
    localStorage.setItem("demandeur-onboarding-done", "1");
    onComplete();
  };

  const steps = [
    {
      icon: <Package size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-primary/70",
      title: t("tutDem.s1Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutDem.s1Desc") }} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <Send size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{t("tutDem.s1Send")}</p>
              <p className="text-[10px] text-muted-foreground">{t("tutDem.s1SendDesc")}</p>
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-center">
              <ShoppingBag size={20} className="text-secondary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{t("tutDem.s1Needit")}</p>
              <p className="text-[10px] text-muted-foreground">{t("tutDem.s1NeeditDesc")}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Send size={36} className="text-primary-foreground" />,
      gradient: "from-secondary to-secondary/70",
      title: t("tutDem.s2Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutDem.s2Desc") }} />
          <div className="space-y-2 mt-3">
            {[t("tutDem.s2Step1"), t("tutDem.s2Step2"), t("tutDem.s2Step3"), t("tutDem.s2Step4")].map((text, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-xs font-medium text-foreground text-left">{text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <ShoppingBag size={36} className="text-primary-foreground" />,
      gradient: "from-warning to-warning/70",
      title: t("tutDem.s3Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutDem.s3Desc") }} />
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "🔍", key: "tutDem.s3Step1" },
              { emoji: "🌍", key: "tutDem.s3Step2" },
              { emoji: "💰", key: "tutDem.s3Step3" },
              { emoji: "🤝", key: "tutDem.s3Step4" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{item.emoji}</span>
                <p className="text-xs text-foreground leading-relaxed">{t(item.key)}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <Shield size={36} className="text-primary-foreground" />,
      gradient: "from-accent to-accent/70",
      title: t("tutDem.s4Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutDem.s4Desc") }} />
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "🔐", key: "tutDem.s4Escrow" },
              { emoji: "📸", key: "tutDem.s4Photo" },
              { emoji: "🔔", key: "tutDem.s4Notif" },
              { emoji: "⚖️", key: "tutDem.s4Dispute" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{item.emoji}</span>
                <p className="text-xs text-foreground leading-relaxed">{t(item.key)}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <MapPin size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-secondary/70",
      title: t("tutDem.s5Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutDem.s5Desc") }} />
          <div className="space-y-2 mt-3">
            {[
              { emoji: "📦", text: t("tutDem.s5Send") },
              { emoji: "🛒", text: t("tutDem.s5Needit") },
              { emoji: "📊", text: t("tutDem.s5Dashboard") },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <span className="text-lg shrink-0">{item.emoji}</span>
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
  const stepLabel = t("tutDem.step").replace("{current}", String(step + 1)).replace("{total}", String(steps.length));

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header: step indicator + glossary + skip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
          {stepLabel}
        </span>
        <div className="flex items-center gap-3">
          <GlossaryButton variant="ghost" />
          <button
            onClick={handleFinish}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {t("tutDem.skip")} <X size={14} />
          </button>
        </div>
      </div>

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

      <div className="px-6 pb-8 space-y-2">
        {isLast ? (
          <>
            <button
              onClick={() => { handleFinish(); navigate("/send-coly"); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Package size={18} /> {t("tutDem.s5Send")}
            </button>
            <button
              onClick={() => { handleFinish(); navigate("/needit-mission"); }}
              className="w-full py-3.5 rounded-2xl border border-secondary/30 bg-secondary/5 text-foreground text-sm font-medium hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} /> {t("tutDem.s5Needit")}
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-2xl text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              {t("tutDem.s5Dashboard")}
            </button>
          </>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            {t("tutDem.next")} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DemandeurOnboarding;
