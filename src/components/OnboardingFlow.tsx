import { useState, useId, useRef, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import Nido, { NidoPose } from "@/components/Nido";

const swipeThreshold = 50;

interface OnboardingFlowProps { onComplete: () => void; }

interface Slide {
  pose: NidoPose;
  animate: "float" | "bounce" | "wiggle" | "none";
  badge: string; // role / concept tag
  title: string;
  description: string;
  accent: string; // Tailwind gradient classes (semantic tokens)
}

/**
 * Onboarding storytellé en 3 écrans avec Nido.
 * Chaque écran présente un concept-clé du vocabulaire Nidit pour réduire
 * la charge cognitive : Demandeur → Voyageur → NeedIt.
 */
const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const slides: Slide[] = [
    {
      pose: "hello",
      animate: "wiggle",
      badge: t("onboarding.badge.demandeur"),
      title: t("onboarding.slide1Title"),
      description: t("onboarding.slide1Desc"),
      accent: "from-primary/30 via-primary/10 to-transparent",
    },
    {
      pose: "fly",
      animate: "float",
      badge: t("onboarding.badge.voyageur"),
      title: t("onboarding.slide2Title"),
      description: t("onboarding.slide2Desc"),
      accent: "from-accent/30 via-accent/10 to-transparent",
    },
    {
      pose: "celebrate",
      animate: "bounce",
      badge: t("onboarding.badge.needit"),
      title: t("onboarding.slide3Title"),
      description: t("onboarding.slide3Desc"),
      accent: "from-secondary/30 via-secondary/10 to-transparent",
    },
  ];

  const paginate = (dir: number) => {
    const next = current + dir;
    if (next < 0 || next >= slides.length) return;
    setDirection(dir);
    setCurrent(next);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -swipeThreshold) paginate(1);
    else if (info.offset.x > swipeThreshold) paginate(-1);
  };

  const finish = (path: string) => {
    localStorage.setItem("onboarding-done", "1");
    onComplete();
    if (path !== "/") navigate(path);
  };

  const variants = prefersReducedMotion
    ? { enter: { x: 0, opacity: 1 }, center: { x: 0, opacity: 1 }, exit: { x: 0, opacity: 1 } }
    : {
        enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
      };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid="onboarding-dialog"
      className="fixed inset-0 z-[100] flex flex-col bg-background outline-none overflow-hidden"
    >
      {/* Soft ambient gradient backdrop that morphs per slide */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${slide.accent} transition-colors duration-700`}
      />

      {!isLast && (
        <button
          type="button"
          onClick={() => finish("/")}
          aria-label={t("onboarding.skip")}
          data-testid="onboarding-skip"
          className="absolute top-6 right-6 z-10 text-sm text-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-2 py-1"
        >
          {t("onboarding.skip")}
        </button>
      )}

      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
            drag={prefersReducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="flex flex-col items-center text-center max-w-sm w-full select-none"
          >
            {/* Nido hero */}
            <div className="mb-6">
              <Nido
                pose={slide.pose}
                size="xl"
                animate={slide.animate}
                priority={current === 0}
              />
            </div>

            {/* Concept badge */}
            <span className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-card/80 backdrop-blur border border-border text-xs font-bold uppercase tracking-wider text-primary">
              {slide.badge}
            </span>

            <h2
              id={titleId}
              className="text-2xl font-bold text-foreground whitespace-pre-line leading-tight mb-3"
            >
              {slide.title}
            </h2>
            <p
              id={descId}
              className="text-base text-foreground/60 whitespace-pre-line leading-relaxed"
            >
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        role="tablist"
        aria-label="Onboarding progress"
        className="relative flex justify-center gap-2 mb-6"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`}
          />
        ))}
      </div>

      <div className="relative px-6 pb-10 space-y-3">
        {isLast ? (
          <>
            <button
              type="button"
              onClick={() => finish("/signup")}
              data-testid="onboarding-create-account"
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-semibold shadow-lg active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("onboarding.createAccount")}
            </button>
            <button
              type="button"
              onClick={() => finish("/login")}
              data-testid="onboarding-have-account"
              className="w-full py-4 rounded-2xl border border-border text-foreground text-base font-medium hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t("onboarding.haveAccount")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => paginate(1)}
            data-testid="onboarding-next"
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-semibold shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("onboarding.next")} <ArrowRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
