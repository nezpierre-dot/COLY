import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plane, Package, Shield, ArrowRight, X, SlidersHorizontal, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface VoyageurOnboardingProps {
  onComplete: () => void;
}

const CUTOFF_OPTIONS_KEYS = [
  { value: "6", label: "6h", descKey: "tutVoy.s2LastMin" },
  { value: "12", label: "12h", descKey: "tutVoy.s2HalfDay" },
  { value: "24", label: "24h", descKey: "tutVoy.s2Recommended" },
  { value: "48", label: "48h", descKey: "tutVoy.s2Comfortable" },
  { value: "72", label: "72h", descKey: "tutVoy.s2VeryEarly" },
];

const VoyageurOnboarding = ({ onComplete }: VoyageurOnboardingProps) => {
  const [step, setStep] = useState(0);
  const [selectedCutoff, setSelectedCutoff] = useState("24");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleFinish = () => {
    localStorage.setItem("voyageur-onboarding-done", "1");
    localStorage.setItem("voyageur-preferred-cutoff", selectedCutoff);
    onComplete();
  };

  const steps = [
    {
      icon: <Plane size={36} className="text-primary-foreground" />,
      gradient: "from-primary to-primary/70",
      title: t("tutVoy.s1Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutVoy.s1Desc") }} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <Package size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{t("tutVoy.s1Transport")}</p>
              <p className="text-[10px] text-muted-foreground">{t("tutVoy.s1TransportDesc")}</p>
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3 text-center">
              <Shield size={20} className="text-secondary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{t("tutVoy.s1Secure")}</p>
              <p className="text-[10px] text-muted-foreground">{t("tutVoy.s1SecureDesc")}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Clock size={36} className="text-primary-foreground" />,
      gradient: "from-warning to-warning/70",
      title: t("tutVoy.s2Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutVoy.s2Desc") }} />
          <div className="space-y-1.5 mt-3">
            {CUTOFF_OPTIONS_KEYS.map(opt => (
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
                  <span className="text-xs text-muted-foreground">{t(opt.descKey)}</span>
                </div>
                {opt.value === "24" && (
                  <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    {t("tutVoy.s2Default")}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{t("tutVoy.s2Hint")}</p>
        </div>
      ),
    },
    {
      icon: <Bell size={36} className="text-primary-foreground" />,
      gradient: "from-accent to-accent/70",
      title: t("tutVoy.s3Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutVoy.s3Desc") }} />
          <div className="space-y-2 text-left mt-3">
            {[
              { emoji: "⚡", key: "tutVoy.s3Match" },
              { emoji: "⏰", key: "tutVoy.s3Cutoff" },
              { emoji: "✅", key: "tutVoy.s3Delivery" },
              { emoji: "📧", key: "tutVoy.s3Email" },
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
      icon: <SlidersHorizontal size={36} className="text-primary-foreground" />,
      gradient: "from-secondary to-secondary/70",
      title: t("tutVoy.s4Title"),
      content: (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("tutVoy.s4Desc") }} />
          <div className="space-y-2 mt-3">
            {[t("tutVoy.s4Step1"), t("tutVoy.s4Step2"), t("tutVoy.s4Step3")].map((text, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2" dangerouslySetInnerHTML={{ __html: t("tutVoy.s4CutoffSelected").replace("{hours}", selectedCutoff) }} />
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const stepLabel = t("tutVoy.step").replace("{current}", String(step + 1)).replace("{total}", String(steps.length));

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header: step indicator + skip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
          {stepLabel}
        </span>
        <button
          onClick={handleFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {t("tutVoy.skip")} <X size={14} />
        </button>
      </div>

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

      {/* Actions */}
      <div className="px-6 pb-8 space-y-2">
        {isLast ? (
          <>
            <button
              onClick={() => { handleFinish(); navigate("/new-trip"); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Plane size={18} /> {t("tutVoy.s4Publish")}
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              {t("tutVoy.s4Dashboard")}
            </button>
          </>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            {t("tutVoy.next")} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoyageurOnboarding;
