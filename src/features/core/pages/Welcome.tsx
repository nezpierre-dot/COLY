import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Plane, Package, Coins } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo-nidit.png";

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("onboarding-done")
  );
  // Tracks whether the user just finished the onboarding so we can return
  // focus to the primary CTA (a11y: avoid losing focus position).
  const justFinishedOnboardingRef = useRef(false);
  const signupCtaRef = useRef<HTMLButtonElement>(null);

  // After onboarding closes, send focus to the signup CTA so keyboard and
  // screen-reader users land on the next meaningful action.
  useEffect(() => {
    if (!showOnboarding && justFinishedOnboardingRef.current) {
      justFinishedOnboardingRef.current = false;
      // Wait for the Welcome layout to mount before focusing.
      requestAnimationFrame(() => signupCtaRef.current?.focus());
    }
  }, [showOnboarding]);

  // If user is already authenticated, go to dashboard (skip onboarding)
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (showOnboarding && !loading && !user) {
    return (
      <OnboardingFlow
        onComplete={() => {
          justFinishedOnboardingRef.current = true;
          setShowOnboarding(false);
        }}
      />
    );
  }


  // Split tagline → highlight last meaningful line with gradient
  const tagline = t("welcome.tagline");
  const lines = tagline.split("\n");

  // Staggered entrance — disabled when user prefers reduced motion
  const container: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      };

  const item: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
        },
      };

  // Looping blob animations — completely disabled with reduced motion
  const blobAnim = (
    keyframes: { x?: number[]; y?: number[]; scale?: number[] },
    duration: number,
  ) =>
    prefersReducedMotion
      ? undefined
      : {
          animate: keyframes,
          transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
        };

  const haloAnim = prefersReducedMotion
    ? undefined
    : {
        animate: { scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] },
        transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
      };

  const benefits = [
    { icon: Plane, label: "Voyagez malin" },
    { icon: Package, label: "Recevez vite" },
    { icon: Coins, label: "Gagnez en route" },
  ];

  // Shared focus ring used across all CTAs
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <main
      role="main"
      aria-labelledby="welcome-title"
      className="flex min-h-[100dvh] flex-col relative overflow-hidden"
      style={{ background: "var(--gradient-hero-bright)" }}
    >
      {/* Animated organic blobs — Future DA. Decorative only. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 w-[28rem] h-[28rem] sm:w-[32rem] sm:h-[32rem] rounded-full bg-primary/30 blur-3xl"
        {...(blobAnim({ x: [0, 20, 0], y: [0, 15, 0] }, 14) ?? {})}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-32 -right-32 w-[24rem] h-[24rem] sm:w-[28rem] sm:h-[28rem] rounded-full bg-secondary/35 blur-3xl"
        {...(blobAnim({ x: [0, -18, 0], y: [0, 22, 0] }, 18) ?? {})}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[28rem] h-[22rem] sm:w-[34rem] sm:h-[26rem] rounded-full bg-accent/25 blur-3xl"
        {...(blobAnim({ scale: [1, 1.08, 1] }, 12) ?? {})}
      />

      {/* Subtle decorative accents */}
      <div aria-hidden="true" className="pointer-events-none absolute top-20 right-6 sm:right-8 opacity-40">
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
      <div aria-hidden="true" className="pointer-events-none absolute top-32 right-8 sm:right-10 grid grid-cols-4 gap-1.5 opacity-30">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        ))}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col flex-1 w-full max-w-md mx-auto"
        data-testid="welcome-stage"
      >
        {/* Hero logo */}
        <motion.div
          variants={item}
          className="flex flex-col items-center pt-10 sm:pt-14 pb-4 sm:pb-6"
        >
          <div className="relative">
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 blur-2xl"
              {...(haloAnim ?? {})}
            />
            <img
              src={logo}
              alt="Nidit"
              width={160}
              height={160}
              className="relative w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-[0_12px_32px_rgba(79,124,255,0.35)]"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div variants={item} className="px-6 text-center">
          <h1
            id="welcome-title"
            className="text-[2.5rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.15] font-bold tracking-tight text-foreground pb-1"
          >
            {lines.slice(0, -1).map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
            {lines.length > 0 && (
              <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent pb-1">
                {lines[lines.length - 1]}
              </span>
            )}
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-4 sm:mt-5 px-6 text-center text-sm sm:text-base text-foreground/65 max-w-md mx-auto leading-relaxed"
        >
          Connectez voyageurs et demandeurs en toute simplicité.
        </motion.p>

        {/* Social proof */}
        <motion.div
          variants={item}
          className="mt-5 sm:mt-6 flex items-center justify-center gap-3"
          aria-label="2 500 utilisateurs nous font confiance"
        >
          <div className="flex -space-x-2" aria-hidden="true">
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
        <motion.ul
          variants={item}
          className="mt-6 sm:mt-8 px-6 grid grid-cols-3 gap-2 sm:gap-3 w-full"
          aria-label="Avantages Nidit"
          data-testid="benefits-list"
        >
          {benefits.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col items-center gap-2 px-2 py-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-soft"
            >
              <div
                aria-hidden="true"
                className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15"
              >
                <Icon size={18} className="text-primary" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-foreground/80 text-center leading-tight">
                {label}
              </span>
            </li>
          ))}
        </motion.ul>

        {/* Spacer */}
        <div className="flex-1 min-h-[1.5rem]" />

        {/* CTA */}
        <motion.div
          variants={item}
          className="px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <button
            ref={signupCtaRef}
            type="button"
            onClick={() => navigate("/signup")}
            aria-label={`${t("welcome.signup")} – créer un compte Nidit`}
            data-testid="cta-signup"
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground text-base font-semibold shadow-soft hover:shadow-elevated active:scale-[0.98] transition-all ${focusRing}`}
          >
            {t("welcome.signup")}
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <div className="mt-5 text-center">
            <span className="text-sm text-foreground/60">Déjà inscrit ? </span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              data-testid="cta-login"
              className={`text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline rounded-md px-1 ${focusRing}`}
            >
              {t("welcome.haveAccount")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
};

export default Welcome;
