import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import Nido from "@/components/Nido";

interface SuccessCheckProps {
  show: boolean;
  size?: number;
  className?: string;
  /** When true, replaces the checkmark with a celebrating Nido mascot */
  withNido?: boolean;
}

/**
 * Animated success indicator. By default a green checkmark — set `withNido`
 * for a delightful celebrating mascot moment after major successes.
 */
const SuccessCheck = ({ show, size = 48, className = "", withNido = false }: SuccessCheckProps) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={
          withNido
            ? `inline-flex items-center justify-center ${className}`
            : `inline-flex items-center justify-center rounded-full bg-green-500/15 ${className}`
        }
        style={withNido ? undefined : { width: size, height: size }}
      >
        {withNido ? (
          <Nido pose="celebrate" size={size > 80 ? "lg" : size > 48 ? "md" : "sm"} animate="bounce" />
        ) : (
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Check size={size * 0.55} strokeWidth={3} className="text-green-500" />
          </motion.div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

export default SuccessCheck;
