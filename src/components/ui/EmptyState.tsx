/**
 * EmptyState — composant réutilisable pour états vides (listes, recherches, dashboards).
 *
 * Usage :
 *   <EmptyState
 *     icon={Inbox}
 *     title="Aucun colis pour l'instant"
 *     description="Tu n'as encore rien expédié. Lance ton premier envoi en 30 secondes."
 *     primary={{ label: "Envoyer un colis", to: "/send", icon: Package }}
 *     secondary={{ label: "Comment ça marche", to: "/comment-ca-marche" }}
 *     variant="page"
 *     tone="primary"
 *   />
 *
 * Variantes : compact (inline) | page (centré, plus aéré).
 * Tonalités  : neutral | primary | secondary | accent.
 * Respecte prefers-reduced-motion via Framer.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  description?: string;
  primary?: EmptyStateAction;
  secondary?: EmptyStateAction;
  variant?: "compact" | "page";
  tone?: "neutral" | "primary" | "secondary" | "accent";
  className?: string;
}

type ToneKey = NonNullable<EmptyStateProps["tone"]>;
const TONES: Record<ToneKey, { ring: string; bg: string; iconColor: string }> = {
  neutral:   { ring: "ring-border/60",    bg: "bg-muted",          iconColor: "text-muted-foreground" },
  primary:   { ring: "ring-primary/20",   bg: "bg-primary/10",     iconColor: "text-primary" },
  secondary: { ring: "ring-secondary/30", bg: "bg-secondary/15",   iconColor: "text-secondary-foreground" },
  accent:    { ring: "ring-accent/30",    bg: "bg-accent/15",      iconColor: "text-accent-foreground" },
};

function ActionBtn({ action, primary }: { action: EmptyStateAction; primary: boolean }) {
  const Icon = action.icon;
  const cls = primary
    ? "btn-cta-primary text-sm h-11 px-5"
    : "btn-cta-secondary text-sm h-11 px-5";
  const inner = (
    <>
      {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null}
      {action.label}
    </>
  );
  if (action.to) {
    return <Link to={action.to} className={cls}>{inner}</Link>;
  }
  return <button type="button" onClick={action.onClick} className={cls}>{inner}</button>;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  primary,
  secondary,
  variant = "compact",
  tone = "primary",
  className,
}: EmptyStateProps) {
  const reduce = useReducedMotion();
  const t = TONES[tone];
  const isPage = variant === "page";
  const wrap     = isPage ? "py-16 sm:py-24 px-6" : "py-10 px-5";
  const iconBox  = isPage ? "w-20 h-20"          : "w-14 h-14";
  const iconSize = isPage ? "w-10 h-10"          : "w-7 h-7";
  const titleCls = isPage ? "text-title-lg"      : "text-title-sm";
  const descCls  = isPage ? "text-body-lg"       : "text-body-base";
  return (
    <motion.section
      role="region"
      aria-label={title}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center text-center max-w-md mx-auto ${wrap} ${className ?? ""}`}
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <div className={`rounded-3xl flex items-center justify-center mb-6 ring-1 ${iconBox} ${t.bg} ${t.ring}`}>
          <Icon className={`${iconSize} ${t.iconColor}`} aria-hidden="true" />
        </div>
      ) : null}
      <h3 className={`${titleCls} font-bold mb-2`}>{title}</h3>
      {description ? (<p className={`${descCls} text-muted-foreground mb-6`}>{description}</p>) : null}
      {(primary || secondary) ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          {primary ? <ActionBtn action={primary} primary /> : null}
          {secondary ? <ActionBtn action={secondary} primary={false} /> : null}
        </div>
      ) : null}
    </motion.section>
  );
}

export default EmptyState;
