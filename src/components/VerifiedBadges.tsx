import { ShieldCheck, Mail, Phone, CreditCard, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

export interface VerifiedSignals {
  kyc?: boolean;
  email?: boolean;
  phone?: boolean;
  payment?: boolean;
}

interface VerifiedBadgesProps {
  signals: VerifiedSignals;
  variant?: "row" | "compact" | "hero";
  className?: string;
}

const items = [
  { key: "kyc", label: "Identité", icon: ShieldCheck },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Téléphone", icon: Phone },
  { key: "payment", label: "Paiement", icon: CreditCard },
] as const;

const VerifiedBadges = ({
  signals,
  variant = "row",
  className = "",
}: VerifiedBadgesProps) => {
  const verifiedCount = items.filter((i) => signals[i.key]).length;
  const total = items.length;
  const fullyVerified = verifiedCount === total;

  if (variant === "compact") {
    if (verifiedCount === 0) return null;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          fullyVerified
            ? "bg-success/10 border-success/30 text-success"
            : "bg-primary/10 border-primary/30 text-primary"
        } ${className}`}
        aria-label={`${verifiedCount} vérifications sur ${total}`}
      >
        <BadgeCheck size={12} />
        {fullyVerified ? "Vérifié" : `${verifiedCount}/${total} vérifiés`}
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border bg-card/80 backdrop-blur p-3 ${
          fullyVerified ? "border-success/30" : "border-border"
        } ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BadgeCheck
              size={14}
              className={fullyVerified ? "text-success" : "text-primary"}
            />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Vérifications
            </h3>
          </div>
          <span
            className={`text-[11px] font-bold ${
              fullyVerified ? "text-success" : "text-muted-foreground"
            }`}
          >
            {verifiedCount}/{total}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {items.map(({ key, label, icon: Icon }) => {
            const ok = !!signals[key];
            return (
              <div
                key={key}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-center transition-colors ${
                  ok
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-border bg-muted/20 text-muted-foreground/50"
                }`}
                aria-label={`${label} ${ok ? "vérifié" : "non vérifié"}`}
              >
                <Icon size={16} />
                <span className="text-[10px] font-semibold leading-tight">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // row variant
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map(({ key, label, icon: Icon }) => {
        const ok = !!signals[key];
        if (!ok) return null;
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20"
            aria-label={`${label} vérifié`}
          >
            <Icon size={11} />
            {label}
          </span>
        );
      })}
    </div>
  );
};

export default VerifiedBadges;
