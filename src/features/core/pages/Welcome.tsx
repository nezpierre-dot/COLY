import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

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

  return (
    <div
      className="flex min-h-screen flex-col relative overflow-hidden"
      style={{ background: "var(--gradient-hero-bright)" }}
    >
      {/* Organic blobs — Future DA */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute top-32 -right-32 w-[26rem] h-[26rem] rounded-full bg-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[30rem] h-[24rem] rounded-full bg-accent/20 blur-3xl" />

      {/* Subtle decorative accents */}
      <div className="pointer-events-none absolute top-16 right-8 opacity-50">
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
      <div className="pointer-events-none absolute top-28 right-10 grid grid-cols-4 gap-1.5 opacity-40">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-20 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-soft mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-foreground/80 tracking-wide">
            Nidit
          </span>
        </div>
        <h1 className="text-[2.6rem] font-bold leading-[1.1] tracking-tight whitespace-pre-line bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
          {t("welcome.tagline")}
        </h1>
        <p className="mt-4 text-base text-foreground/65 max-w-md leading-relaxed">
          Connectez voyageurs et demandeurs en toute simplicité.
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA buttons */}
      <div className="relative z-10 px-6 pb-12 space-y-3">
        <button
          onClick={() => navigate("/signup")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground text-base font-semibold shadow-soft hover:shadow-elevated active:scale-[0.98] transition-all"
        >
          {t("welcome.signup")}
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => navigate("/login")}
          className="w-full py-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md text-foreground text-base font-medium shadow-soft hover:bg-white hover:shadow-elevated transition-all"
        >
          {t("welcome.haveAccount")}
        </button>
      </div>
    </div>
  );
};

export default Welcome;
