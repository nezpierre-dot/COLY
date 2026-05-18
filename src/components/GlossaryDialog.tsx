import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Package, Plane, ShoppingBag, Lock, ShieldCheck, KeyRound, BadgeCheck, X } from "lucide-react";
import Nido from "@/components/Nido";
import { useTranslation } from "@/hooks/useTranslation";

interface GlossaryDialogProps {
  open: boolean;
  onClose: () => void;
}

interface GlossaryEntry {
  key: string;
  icon: React.ReactNode;
  title: string;
  short: string;
}

/**
 * Glossaire visuel — explique en une ligne le vocabulaire Nidit.
 * Accessible depuis Aide / Réglages, et lié par TermTooltip.
 */
const GlossaryDialogBase = ({ open, onClose }: GlossaryDialogProps) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  const entries: GlossaryEntry[] = [
    { key: "demandeur", icon: <Package size={18} />, title: t("glossary.demandeur.title"), short: t("glossary.demandeur.short") },
    { key: "voyageur", icon: <Plane size={18} />, title: t("glossary.voyageur.title"), short: t("glossary.voyageur.short") },
    { key: "needit", icon: <ShoppingBag size={18} />, title: t("glossary.needit.title"), short: t("glossary.needit.short") },
    { key: "colis", icon: <Package size={18} />, title: t("glossary.colis.title"), short: t("glossary.colis.short") },
    { key: "escrow", icon: <Lock size={18} />, title: t("glossary.escrow.title"), short: t("glossary.escrow.short") },
    { key: "kyc", icon: <ShieldCheck size={18} />, title: t("glossary.kyc.title"), short: t("glossary.kyc.short") },
    { key: "otp", icon: <KeyRound size={18} />, title: t("glossary.otp.title"), short: t("glossary.otp.short") },
    { key: "trust", icon: <BadgeCheck size={18} />, title: t("glossary.trust.title"), short: t("glossary.trust.short") },
  ];

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-title"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 28 }}
        className="relative w-full sm:w-[420px] max-h-[85vh] overflow-y-auto bg-card border-t border-border sm:border sm:rounded-3xl rounded-t-3xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-card/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Nido pose="hello" size="xs" animate="wiggle" />
            <div className="min-w-0">
              <h2 id="glossary-title" className="text-base font-bold text-foreground truncate">
                {t("glossary.title")}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {t("glossary.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 rounded-xl p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Entries */}
        <ul className="p-3 space-y-2">
          {entries.map((e) => (
            <li
              key={e.key}
              className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40"
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                {e.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.short}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 pb-6 pt-2 text-center text-[11px] text-muted-foreground">
          {t("glossary.footer")}
        </div>
      </motion.div>
    </div>
  );
};

const GlossaryDialog = memo(GlossaryDialogBase);
export default GlossaryDialog;
