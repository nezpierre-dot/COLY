import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onFinished }: { onFinished: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setVisible(false);
    setTimeout(onFinished, 500);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(13,132,255,0.20), rgba(48,209,88,0.20))"
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#0D84FF]/5" />
          <div className="absolute bottom-20 -left-8 w-28 h-28 rounded-full bg-[#30D158]/5" />
          <div className="absolute top-1/3 right-10 w-16 h-16 rounded-full bg-[#0D84FF]/[0.08]" />

          {/* Centered content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Logo icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="mb-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-[#0D84FF]/15 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-[#0D84FF]/20">
                <svg width="40" height="24" viewBox="0 0 40 24">
                  <path d="M2 12c5-10 12-10 18 0s12 10 18 0" stroke="#0D84FF" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl font-black tracking-tight mb-2 text-foreground"
            >
              Coly
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-muted-foreground text-sm font-medium text-center max-w-[260px] leading-relaxed"
            >
              Partagez vos trajets, économisez &amp; protégez la planète 🌍
            </motion.p>
          </div>

          {/* Bottom CTA button */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={ready ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="pb-12 px-6 w-full max-w-xs"
          >
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl bg-[#0D84FF] text-white font-semibold text-base shadow-lg shadow-[#0D84FF]/30 active:scale-[0.97] transition-transform"
            >
              Commencer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
