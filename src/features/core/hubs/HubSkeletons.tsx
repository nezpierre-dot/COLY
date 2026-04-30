/**
 * Skeleton placeholders for the 3 hubs. Shown while the lazy chunk loads or
 * while the underlying page fetches its data — provides a perceived-performance
 * boost vs a centered spinner.
 */
import { motion } from "framer-motion";

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);

export const WalletHubSkeleton = () => (
  <div className="px-4 pt-4 space-y-4" aria-busy="true" aria-live="polite">
    <span className="sr-only">Chargement du portefeuille…</span>
    <div className="h-32 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 animate-pulse" />
    <Bar className="h-4 w-1/3" />
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="h-14 rounded-xl bg-card border border-border flex items-center gap-3 px-3"
        >
          <Bar className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Bar className="h-3 w-2/3" />
            <Bar className="h-2.5 w-1/3" />
          </div>
          <Bar className="h-3 w-12" />
        </motion.div>
      ))}
    </div>
  </div>
);

export const ProgressionHubSkeleton = () => (
  <div className="px-4 pt-4 space-y-4" aria-busy="true" aria-live="polite">
    <span className="sr-only">Chargement de la progression…</span>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Bar key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
    <Bar className="h-40 rounded-2xl" />
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Bar key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  </div>
);

export const ActivityHubSkeleton = () => (
  <div className="px-4 pt-4 space-y-3" aria-busy="true" aria-live="polite">
    <span className="sr-only">Chargement de l'activité…</span>
    <Bar className="h-10 rounded-xl" />
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.04 }}
        className="h-16 rounded-2xl bg-card border border-border flex items-center gap-3 px-3"
      >
        <Bar className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Bar className="h-3 w-1/2" />
          <Bar className="h-2.5 w-1/4" />
        </div>
      </motion.div>
    ))}
  </div>
);
