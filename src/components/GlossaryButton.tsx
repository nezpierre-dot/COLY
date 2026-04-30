import { useState } from "react";
import { HelpCircle } from "lucide-react";
import GlossaryDialog from "@/components/GlossaryDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface GlossaryButtonProps {
  /** Visual variant */
  variant?: "subtle" | "ghost" | "link";
  className?: string;
  /** Override label (default: t("glossary.title")) */
  label?: string;
  /** Hide the icon and only show the label */
  iconless?: boolean;
}

/**
 * Petit bouton réutilisable qui ouvre le GlossaryDialog.
 * À placer dans les contextes où le jargon Nidit pourrait dérouter
 * (onboardings, gates KYC, footer public).
 */
const GlossaryButton = ({
  variant = "subtle",
  className,
  label,
  iconless,
}: GlossaryButtonProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const variantClasses = {
    subtle:
      "inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
    ghost:
      "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
    link:
      "inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors",
  } as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${variantClasses[variant]} ${className ?? ""}`}
        aria-label={t("glossary.title")}
      >
        {!iconless && <HelpCircle size={12} aria-hidden="true" />}
        <span>{label ?? t("glossary.title")}</span>
      </button>
      <GlossaryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default GlossaryButton;
