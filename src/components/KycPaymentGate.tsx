import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, Clock, Award } from "lucide-react";
import Nido from "@/components/Nido";
import { useTranslation } from "@/hooks/useTranslation";

interface KycPaymentGateProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/**
 * Friendly, non-bloquant modal shown right before payment when KYC isn't done yet.
 * Nido explains why with empathy + reassures it's a one-time, 5-minute thing.
 */
const KycPaymentGate = ({ open, onClose, onContinue }: KycPaymentGateProps) => {
  const { t } = useTranslation();

  const points = [
    { icon: Clock, label: t("kycGate.point1") },
    { icon: ShieldCheck, label: t("kycGate.point2") },
    { icon: Award, label: t("kycGate.point3") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="pointer-events-none absolute -top-10 -right-6 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <Nido pose="hello" size="lg" animate="float" />

              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
                {t("kycGate.title")}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t("kycGate.subtitle")}
              </p>

              <ul className="mt-6 w-full space-y-2.5 text-left">
                {points.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                    <div className="shrink-0 rounded-lg bg-primary/15 p-2 text-primary">
                      <p.icon size={16} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex w-full flex-col gap-2">
                <button
                  onClick={onContinue}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]"
                >
                  {t("kycGate.cta")} <ArrowRight size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl px-6 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                >
                  {t("kycGate.later")}
                </button>
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground/70">
                {t("kycGate.savedHint")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KycPaymentGate;
