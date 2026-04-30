import { useState, useId } from "react";
import { HelpCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import GlossaryDialog from "@/components/GlossaryDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface TermTooltipProps {
  /** The term as it appears in the running text (e.g. "Voyageur") */
  term: string;
  /** Short definition shown in the bubble */
  definition: string;
  /** Optional className for the trigger span */
  className?: string;
  /** When true, hides the small (?) icon and only underlines the term */
  iconless?: boolean;
}

/**
 * Inline tooltip for jargon terms (Voyageur, Demandeur, NeedIt, Escrow…).
 * - Tap/click on mobile: opens a small bubble.
 * - Hover on desktop: also opens.
 * - Bubble has a "Tout voir" link → ouvre le glossaire complet.
 */
const TermTooltip = ({ term, definition, className, iconless }: TermTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const bubbleId = useId();

  return (
    <>
      <span className={`relative inline-flex items-baseline gap-0.5 ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-describedby={open ? bubbleId : undefined}
          aria-label={`${term} — ${t("glossary.openDefinition")}`}
          className="inline-flex items-center gap-0.5 underline decoration-dotted decoration-primary/60 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm"
        >
          <span>{term}</span>
          {!iconless && (
            <HelpCircle size={11} className="opacity-60 translate-y-[1px]" aria-hidden="true" />
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.span
              id={bubbleId}
              role="tooltip"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 24 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[240px] z-50 rounded-xl bg-popover border border-border shadow-xl p-3 text-left"
            >
              <p className="text-xs font-bold text-foreground">{term}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{definition}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setGlossaryOpen(true);
                }}
                className="mt-2 text-[11px] font-semibold text-primary hover:underline"
              >
                {t("glossary.seeAll")} →
              </button>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-popover border-r border-b border-border" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <GlossaryDialog open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </>
  );
};

export default TermTooltip;
