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

  // If user is already authenticated (e.g. after Google OAuth redirect), go to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-coly-blue relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute top-12 right-8 text-white/30">
        <svg width="24" height="16" viewBox="0 0 24 16"><path d="M1 8c3-6 7-6 10 0s7 6 10 0" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
      </div>
      <div className="absolute top-24 right-12 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>
      <div className="absolute top-64 left-0 w-32 h-32 rounded-full bg-white/10 -translate-x-1/2" />

      {/* Header */}
      <div className="relative z-10 px-6 pt-16 pb-8">
        <svg className="mb-4" width="40" height="20" viewBox="0 0 40 20">
          <path d="M2 10c5-8 10-8 16 0s10 8 16 0" stroke="white" strokeWidth="2.5" fill="none"/>
        </svg>
        <h1 className="text-4xl font-bold text-white leading-tight whitespace-pre-line">
          {t("welcome.tagline")}
        </h1>
      </div>

      {/* Spacer for illustration area */}
      <div className="flex-1" />

      {/* Buttons */}
      <div className="relative z-10 px-6 pb-12 space-y-4">
        <button
          onClick={() => navigate("/login")}
          className="w-full py-4 rounded-2xl border-2 border-white/40 bg-coly-blue-dark/60 text-white text-lg font-medium backdrop-blur-sm hover:bg-coly-blue-dark/80 transition-colors"
        >
          {t("welcome.haveAccount")}
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="w-full py-4 rounded-2xl border-2 border-white/40 bg-coly-blue-dark/60 text-white text-lg font-medium backdrop-blur-sm hover:bg-coly-blue-dark/80 transition-colors"
        >
          {t("welcome.signup")}
        </button>
      </div>
    </div>
  );
};

export default Welcome;
