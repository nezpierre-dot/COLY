import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Plane, Package, Coins } from "lucide-react";
import { motion } from "framer-motion";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo-nidit.png";

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("onboarding-done")
  );

  // If user is already authenticated, go to dashboard (skip onboarding)
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (showOnboarding && !loading && !user) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  // Split tagline → highlight last meaningful word with gradient
  const tagline = t("welcome.tagline");
  const lines = tagline.split("\n");

  // Staggered entrance
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const benefits = [
    { icon: Plane, label: "Voyagez malin" },
    { icon: Package, label: "Recevez vite" },
    { icon: Coins, label: "Gagnez en route" },
  ];

  return (
    <div
      className="flex min-h-screen flex-col relative overflow-hidden"
      style={{ background: "var(--gradient-hero-bright)" }}
    >
      {/* Animated organic blobs — Future DA */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-primary/30 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-secondary/35 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 22, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[34rem] h-[26rem] rounded-full bg-accent/25 blur-3xl"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle decorative accents */}
      <div className="pointer-events-none absolute top-20 right-8 opacity-40">
        <svg width="48" height="22" viewBox="0 0 48 22">
          <path
            d="M2 11c6-10 12-10 20 0s14 10 24 0"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="pointer-events-none absolute top-32 right-10 grid grid-cols-4 gap-1.5 opacity-30">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        ))}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col flex-1"
      >
        {/* Hero logo — centered, generous, with animated halo */}
        <motion.div variants={item} className="flex flex-col items-center pt-16 pb-6">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 blur-2xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <img
              src={logo}
              alt="Nidit"
              className="relative w-40 h-40 object-contain drop-shadow-[0_12px_32px_rgba(79,124,255,0.35)]"
            />
          </div>
        </motion.div>

        {/* Title with gradient highlight on last line */}
        <motion.div variants={item} className="px-6 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
            {lines.slice(0, -1).map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
            {lines.length > 0 && (
              <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                {lines[lines.length - 1]}
              </span>
            )}
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-5 px-6 text-center text-base text-foreground/65 max-w-md mx-auto leading-relaxed"
        >
          Connectez voyageurs et demandeurs en toute simplicité.
        </motion.p>

        {/* Social proof */}
        <motion.div
          variants={item}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-2">
            {[
              "from-primary to-secondary",
              "from-secondary to-accent",
              "from-accent to-primary",
            ].map((g, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-background shadow-soft`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground/70">
            +2 500 utilisateurs nous font confiance
          </span>
        </motion.div>

        {/* Benefits row */}
        <motion.div
          variants={item}
          className="mt-8 px-6 flex items-stretch justify-center gap-3 max-w-md mx-auto w-full"
        >
          {benefits.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center gap-2 px-2 py-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-soft"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15">
                <Icon size={18} className="text-primary" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-semibold text-foreground/80 text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <motion.div
          variants={item}
          className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6"
        >
          <button
            onClick={() => navigate("/signup")}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground text-base font-semibold shadow-soft hover:shadow-elevated active:scale-[0.98] transition-all"
          >
            {t("welcome.signup")}
            <ArrowRight size={18} />
          </button>

          {/* Login as a discreet text link — less visual noise */}
          <div className="mt-5 text-center">
            <span className="text-sm text-foreground/60">Déjà inscrit ? </span>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              {t("welcome.haveAccount")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Welcome;
