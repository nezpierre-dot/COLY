import { motion } from "framer-motion";
import { useUserPresence, formatLastSeen } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

interface PresenceBadgeProps {
  userId: string | null | undefined;
  variant?: "dot" | "label" | "inline";
  className?: string;
}

/**
 * Live presence badge.
 * - "dot": small green dot only (good for avatars)
 * - "label": pill with "Actif maintenant" or "Vu il y a X"
 * - "inline": text only (no background)
 */
export default function PresenceBadge({
  userId,
  variant = "label",
  className,
}: PresenceBadgeProps) {
  const { isOnline, lastSeenAt } = useUserPresence(userId);

  if (!userId) return null;

  if (variant === "dot") {
    if (!isOnline) return null;
    return (
      <span
        className={cn(
          "relative inline-flex h-3 w-3 shrink-0 rounded-full bg-success ring-2 ring-background",
          className,
        )}
        aria-label="En ligne"
        title="En ligne"
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-success/60"
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      </span>
    );
  }

  if (isOnline) {
    if (variant === "inline") {
      return (
        <span
          className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-success", className)}
        >
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success">
            <motion.span
              className="absolute inset-0 rounded-full bg-success/60"
              animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          </span>
          Actif maintenant
        </span>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success",
          className,
        )}
      >
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success">
          <motion.span
            className="absolute inset-0 rounded-full bg-success/60"
            animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        </span>
        Actif maintenant
      </span>
    );
  }

  const label = formatLastSeen(lastSeenAt);
  if (!label) return null;

  if (variant === "inline") {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/40" />
      {label}
    </span>
  );
}
