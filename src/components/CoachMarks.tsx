import { useEffect, useState, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Wallet, Send, Repeat, Sparkles } from "lucide-react";
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

  // Defer mount until target is in DOM
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey) === "1") return;
    const t = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(t);
  }, [storageKey, delay]);

  const measure = useCallback(() => {
    if (!visible) return;
    const step = steps[stepIdx];
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Wait a tick for scroll then measure
    window.setTimeout(() => setRect(el.getBoundingClientRect()), 280);
  }, [visible, stepIdx, steps]);

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

  const finish = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
    onComplete?.();
  };

  const next = () => {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
    else finish();
  };

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

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="coach-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] pointer-events-auto"
        aria-modal="true"
        role="dialog"
        aria-label="Visite guidée"
      >
        {/* Dim backdrop */}
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={finish} />

        {/* Highlight cutout */}
        {highlightStyle && (
          <div
            style={highlightStyle}
            className="absolute pointer-events-none rounded-2xl ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300"
          />
        )}

        {/* Tooltip card */}
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
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
                <button onClick={finish} aria-label="Passer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-foreground">{current.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{current.description}</p>
            </div>
          </div>

          {/* Progress dots + CTA */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all"
            >
              {stepIdx === steps.length - 1 ? "Terminer" : "Suivant"}
              <ArrowRight size={12} />
            </button>
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
