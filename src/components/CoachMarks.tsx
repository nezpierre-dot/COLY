import { useEffect, useState, useLayoutEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Wallet, Send, Repeat, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";

export interface CoachStep {
  /** CSS selector or data-coach attribute value to highlight */
  selector: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** Force tooltip placement; default = auto */
  placement?: "top" | "bottom";
}

interface CoachMarksProps {
  steps: CoachStep[];
  storageKey: string;
  onComplete?: () => void;
  /** Delay before showing first mark (ms) */
  delay?: number;
}

const PADDING = 8;

const CoachMarks = ({ steps, storageKey, onComplete, delay = 600 }: CoachMarksProps) => {
  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Defer mount until target is in DOM
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey) === "1") return;
    const t = window.setTimeout(() => setVisible(true), prefersReducedMotion ? 0 : delay);
    return () => window.clearTimeout(t);
  }, [storageKey, delay, prefersReducedMotion]);

  const measure = useCallback(() => {
    if (!visible) return;
    const step = steps[stepIdx];
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => setRect(el.getBoundingClientRect()), prefersReducedMotion ? 0 : 280);
  }, [visible, stepIdx, steps, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (!visible) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, visible]);

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
    onComplete?.();
    previousFocusRef.current?.focus?.();
  }, [storageKey, onComplete]);

  const next = useCallback(() => {
    setStepIdx((i) => {
      if (i < steps.length - 1) return i + 1;
      finish();
      return i;
    });
  }, [steps.length, finish]);

  const prev = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1));
  }, []);

  // Mémorise focus avant ouverture, focus auto sur "Suivant"
  useEffect(() => {
    if (!visible) return;
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const t = window.setTimeout(() => nextBtnRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [visible]);

  // Esc / flèches / Tab loop
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
        e.preventDefault();
        prev();
      } else if (e.key === "Tab") {
        const focusables = [nextBtnRef.current, closeBtnRef.current].filter(
          Boolean,
        ) as HTMLElement[];
        if (focusables.length === 0) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = active ? focusables.indexOf(active) : -1;
        const dir = e.shiftKey ? -1 : 1;
        const nextIdx = (idx + dir + focusables.length) % focusables.length;
        e.preventDefault();
        focusables[nextIdx]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, finish, next, prev]);

  if (!visible) return null;
  const current = steps[stepIdx];
  if (!current) return null;

  // Compute tooltip position
  let tooltipStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  let highlightStyle: React.CSSProperties | null = null;
  if (rect) {
    const above = rect.top > window.innerHeight / 2;
    highlightStyle = {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    };
    tooltipStyle = above
      ? { bottom: window.innerHeight - rect.top + 16, left: Math.max(16, Math.min(window.innerWidth - 320 - 16, rect.left)) }
      : { top: rect.bottom + 16, left: Math.max(16, Math.min(window.innerWidth - 320 - 16, rect.left)) };
  }

  const motionInitial = prefersReducedMotion ? false : { opacity: 0 };
  const motionAnimate = prefersReducedMotion ? { opacity: 1 } : { opacity: 1 };
  const cardInitial = prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 };
  const cardAnimate = prefersReducedMotion
    ? { opacity: 1, y: 0, scale: 1 }
    : { opacity: 1, y: 0, scale: 1 };
  const cardExit = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 };
  const cardTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 28 };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="coach-overlay"
        initial={motionInitial}
        animate={motionAnimate}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="fixed inset-0 z-[200] pointer-events-auto"
        aria-modal="true"
        role="dialog"
        aria-label="Visite guidée"
        aria-describedby="coach-desc"
      >
        {/* Dim backdrop */}
        <div
          className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
          onClick={finish}
          aria-hidden="true"
        />

        {/* Highlight cutout */}
        {highlightStyle && (
          <div
            style={highlightStyle}
            className={`absolute pointer-events-none rounded-2xl ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ${
              prefersReducedMotion ? "" : "transition-all duration-300"
            }`}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          key={stepIdx}
          initial={cardInitial}
          animate={cardAnimate}
          exit={cardExit}
          transition={cardTransition}
          style={tooltipStyle}
          className="absolute w-[300px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-2xl shadow-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 text-primary-foreground">
              {current.icon ?? <Sparkles size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {stepIdx + 1} / {steps.length}
                </p>
                <button
                  ref={closeBtnRef}
                  onClick={finish}
                  aria-label="Passer la visite guidée (Échap)"
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X size={14} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-foreground">{current.title}</h3>
              <p id="coach-desc" className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>

          {/* Progress dots + CTA */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full ${prefersReducedMotion ? "" : "transition-all"} ${
                    i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {stepIdx > 0 && (
                <button
                  onClick={prev}
                  aria-label="Étape précédente (←)"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <ArrowLeft size={12} />
                </button>
              )}
              <button
                ref={nextBtnRef}
                onClick={next}
                aria-label={
                  stepIdx === steps.length - 1
                    ? "Terminer la visite (Entrée)"
                    : "Étape suivante (→ ou Entrée)"
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 ${
                  prefersReducedMotion ? "" : "active:scale-95"
                } transition-all`}
              >
                {stepIdx === steps.length - 1 ? "Terminer" : "Suivant"}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// Predefined dashboard coach steps
export const dashboardCoachSteps: CoachStep[] = [
  {
    selector: "[data-coach='wallet']",
    title: "Votre portefeuille",
    description: "Suivez votre solde, rechargez en un clin d'œil et gérez vos paiements depuis ici.",
    icon: <Wallet size={18} />,
  },
  {
    selector: "[data-coach='create-shipment']",
    title: "Créer un envoi",
    description: "Lancez un colis ou une mission NeedIt en quelques étapes. C'est rapide et sécurisé.",
    icon: <Send size={18} />,
  },
  {
    selector: "[data-coach='switch-role']",
    title: "Devenez voyageur",
    description: "Basculez vers le mode Voyageur pour gagner de l'argent en transportant des colis sur vos trajets.",
    icon: <Repeat size={18} />,
  },
];

export default CoachMarks;
