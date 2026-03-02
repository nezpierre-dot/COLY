import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex flex-col items-center justify-center py-14 px-6">
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4, type: "spring", stiffness: 200 }} className="w-20 h-20 rounded-3xl bg-muted/80 flex items-center justify-center mb-4">
      <Icon size={32} className="text-muted-foreground" strokeWidth={1.5} />
    </motion.div>
    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }} className="text-base font-semibold text-foreground text-center">{title}</motion.p>
    <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }} className="text-sm text-muted-foreground mt-1.5 text-center max-w-[260px]">{description}</motion.p>
    {action && (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.3 }} className="mt-5">{action}</motion.div>
    )}
  </motion.div>
);

export default EmptyState;
