import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import Nido, { NidoPose } from "@/components/Nido";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: string; // optional 3D illustration url; takes precedence over icon
  /** When set, displays the Nido mascot in the chosen pose (takes precedence over illustration & icon) */
  nido?: NidoPose;
}

const EmptyState = ({ icon: Icon, title, description, action, illustration }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.45, ease: "easeOut" }}
    className="flex flex-col items-center justify-center py-16 px-6"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 180 }}
      className="mb-5"
    >
      {illustration ? (
        <img
          src={illustration}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={160}
          height={160}
          className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-lg"
        />
      ) : (
        <div className="w-24 h-24 rounded-3xl bg-gradient-soft flex items-center justify-center shadow-soft">
          <Icon size={36} className="text-primary" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      className="text-lg font-bold text-foreground text-center tracking-tight"
    >
      {title}
    </motion.p>
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.3 }}
      className="text-sm text-muted-foreground mt-2 text-center max-w-[300px] leading-relaxed"
    >
      {description}
    </motion.p>
    {action && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="mt-6"
      >
        {action}
      </motion.div>
    )}
  </motion.div>
);

export default EmptyState;
