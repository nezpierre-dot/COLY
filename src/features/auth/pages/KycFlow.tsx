import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle, Shield, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect } from "react";

type KycStep = "intro" | "loading" | "idnow" | "success" | "failure";

const KycFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = (location.state as any)?.returnTo || "/dashboard";
  const { user, session, roles } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");

  const [step, setStep] = useState<KycStep>("intro");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle redirect back from IDnow
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setStep("success");
    } else if (status === "failure" || status === "abort") {
      setStep("failure");
    }
  }, [searchParams]);

  const startIdnowSession = async () => {
    if (!user || !session) return;
    setLoading(true);
    setStep("loading");

    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("idnow-kyc", {
        body: {
          redirectUrl: `${origin}/kyc`,
        },
      });

      if (error) throw new Error(error.message || "Failed to start KYC session");
      if (!data?.onboardingUrl) throw new Error("No onboarding URL returned");

      setOnboardingUrl(data.onboardingUrl);
      setStep("idnow");
    } catch (e: any) {
      console.error("KYC start error:", e);
      toast.error(t("kyc.uploadError") + ": " + e.message);
      setStep("intro");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipKyc = () => {
    toast.info(t("kyc.skipLater"));
    navigate("/dashboard");
  };

  const progress =
    step === "intro" ? 25 :
    step === "loading" ? 50 :
    step === "idnow" ? 75 :
    100;

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="page-header-soft relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="page-content relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-card/80 backdrop-blur shadow-soft flex items-center justify-center">
              <Shield size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {step === "success" ? t("kyc.congrats") : "ID Now"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "intro" && t("kyc.confirmIdentity")}
                {step === "loading" && t("kyc.sending")}
                {step === "idnow" && t("kyc.useServices")}
                {step === "success" && t("kyc.verifiedDesc")}
                {step === "failure" && t("common.error")}
              </p>
            </div>
          </div>

          {step !== "success" && step !== "failure" && (
            <div className="mt-4">
              <div className="w-full h-2 rounded-full bg-card/60 backdrop-blur overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="page-content pt-6">
        <div className="card-future min-h-[50vh] flex flex-col">
          {/* INTRO */}
          {step === "intro" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="text-center mt-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Shield size={40} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t("kyc.firstSend")}</h2>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                  {t("kyc.confirmIdentity")}
                </p>
                <div className="mt-6 space-y-3 text-left bg-muted/50 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{t("kyc.idCard")}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{t("kyc.selfieTitle")}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4 text-xs">{t("kyc.verificationTime")}</p>
              </div>
              <div className="flex items-center justify-between mt-8">
                <button onClick={() => navigate(-1)} className="text-muted-foreground font-medium text-lg">
                  {t("common.back")}
                </button>
                <div className="flex items-center gap-3">
                  {isVoyageur && (
                    <button
                      onClick={handleSkipKyc}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      {t("common.later")}
                    </button>
                  )}
                  <button
                    onClick={startIdnowSession}
                    className="px-10 py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-lg shadow-lg flex items-center gap-2"
                  >
                    {t("common.next")} <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LOADING */}
          {step === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-primary animate-spin mb-4" />
              <p className="text-foreground font-medium">{t("kyc.sending")}...</p>
            </div>
          )}

          {/* IDNOW IFRAME / REDIRECT */}
          {step === "idnow" && onboardingUrl && (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                {t("kyc.scanDoc")}
              </p>
              <div className="flex-1 rounded-2xl overflow-hidden border border-border min-h-[60vh]">
                <iframe
                  src={onboardingUrl}
                  className="w-full h-full min-h-[60vh]"
                  allow="camera; microphone"
                  title="IDnow Verification"
                />
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => window.open(onboardingUrl, "_blank")}
                  className="text-sm text-primary underline"
                >
                  {t("kyc.openInNewTab") || "Open in new tab"}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="mt-8 text-center">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-accent-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t("kyc.identityVerified")}</h2>
                <p className="text-foreground mt-4 text-sm leading-relaxed">{t("kyc.verifiedDesc")}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  {t("kyc.goToDashboard")} <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => navigate("/send-coly")}
                  className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  {t("kyc.sendParcel")} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* FAILURE */}
          {step === "failure" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="mt-8 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle size={40} className="text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t("common.error")}</h2>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                  {t("kyc.uploadError")}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { setStep("intro"); setOnboardingUrl(null); }}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  {t("common.retry") || "Réessayer"} <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-4 rounded-2xl bg-muted text-muted-foreground font-bold text-lg flex items-center justify-center gap-2"
                >
                  {t("kyc.goToDashboard")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default KycFlow;
