import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import Nido from "@/components/Nido";
import { useTranslation } from "@/hooks/useTranslation";

interface DraftResumeBannerProps {
  /** ISO date string when the draft was last saved */
  updatedAt: number;
  /** Click "Reprendre" → navigate back to the form */
  onResume: () => void;
  /** Discard draft */
  onDismiss: () => void;
  /** Short label of what was being created (e.g. "envoi", "mission NeedIt") */
  label?: string;
}

/**
 * Floating banner shown on the dashboard when an unfinished draft exists.
 * Nido peeks from the left, contextual and friendly.
 */
const DraftResumeBanner = ({ updatedAt, onResume, onDismiss, label }: DraftResumeBannerProps) => {
  const { t, language } = useTranslation();
  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;
  const ago = new Date(updatedAt).toLocaleString(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-lg shadow-primary/5"
    >
      <button
        onClick={onDismiss}
        aria-label={t("common.close")}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <Nido pose="sleep" size="sm" animate="float" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {t("draft.resumeTitle", { label: label ?? t("draft.defaultLabel") })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("draft.savedAt", { when: ago })}
          </p>
          <button
            onClick={onResume}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/30 transition active:scale-[0.97]"
          >
            {t("draft.resumeCta")} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DraftResumeBanner;
