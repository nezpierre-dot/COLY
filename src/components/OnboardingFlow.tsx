import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Package, Globe, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

const swipeThreshold = 50;

interface OnboardingFlowProps { onComplete: () => void; }

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const slides = [
    { icon: <Package size={48} />, title: t("onboarding.slide1Title"), description: t("onboarding.slide1Desc"), accent: "from-primary to-primary/70" },
    { icon: <Globe size={48} />, title: t("onboarding.slide2Title"), description: t("onboarding.slide2Desc"), accent: "from-secondary to-secondary/70" },
    { icon: <ShieldCheck size={48} />, title: t("onboarding.slide3Title"), description: t("onboarding.slide3Desc"), accent: "from-accent to-accent/70" },
  ];

  const paginate = (dir: number) => {
    const next = current + dir;
    if (next < 0 || next >= slides.length) return;
    setDirection(dir);
    setCurrent(next);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -swipeThreshold) paginate(1);
    else if (info.offset.x > swipeThreshold) paginate(-1);
  };

  const finish = (path: string) => {
    localStorage.setItem("onboarding-done", "1");
    onComplete();
    navigate(path);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {!isLast && (
        <button onClick={() => finish("/")} className="absolute top-6 right-6 z-10 text-sm text-foreground/60 hover:text-foreground transition-colors">{t("onboarding.skip")}</button>
      )}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-6">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={current} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd} className="flex flex-col items-center text-center max-w-sm w-full select-none">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.accent} flex items-center justify-center text-primary-foreground mb-8 shadow-lg`}>{slide.icon}</div>
            <h2 className="text-2xl font-bold text-foreground whitespace-pre-line leading-tight mb-4">{slide.title}</h2>
            <p className="text-base text-foreground/60 whitespace-pre-line leading-relaxed">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, i) => (
          <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
        ))}
      </div>
      <div className="px-6 pb-10 space-y-3">
        {isLast ? (
          <>
            <button onClick={() => finish("/signup")} className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-semibold shadow-lg active:scale-[0.97] transition-transform">{t("onboarding.createAccount")}</button>
            <button onClick={() => finish("/login")} className="w-full py-4 rounded-2xl border border-border text-foreground text-base font-medium hover:bg-muted/50 transition-colors">{t("onboarding.haveAccount")}</button>
          </>
        ) : (
          <button onClick={() => paginate(1)} className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            {t("onboarding.next")} <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
