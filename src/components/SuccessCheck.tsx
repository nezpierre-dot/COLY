import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface SuccessCheckProps {
  show: boolean;
  size?: number;
  className?: string;
}

/**
 * Animated green checkmark that pops in with a satisfying spring animation.
 * Use after successful validation/submission.
 */
const SuccessCheck = ({ show, size = 48, className = "" }: SuccessCheckProps) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`inline-flex items-center justify-center rounded-full bg-green-500/15 ${className}`}
        style={{ width: size, height: size }}
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <Check
            size={size * 0.55}
            strokeWidth={3}
            className="text-green-500"
          />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SuccessCheck;
