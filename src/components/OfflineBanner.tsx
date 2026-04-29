import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { WifiOff } from "lucide-react";

const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={prefersReducedMotion ? false : { y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: -40, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25 }}
          className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-warning/95 text-warning-foreground text-xs font-semibold py-2 px-4 shadow-lg backdrop-blur"
        >
          <WifiOff size={14} aria-hidden="true" />
          <span>Mode hors-ligne · contenu mis en cache affiché</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
