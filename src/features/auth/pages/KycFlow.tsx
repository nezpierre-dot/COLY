import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

type KycStep = "intro" | "scan" | "review" | "selfie" | "done";
const STEPS_ORDER: KycStep[] = ["intro", "scan", "review", "selfie", "done"];

const KycFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo || "/dashboard";
  const { user, roles } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");
  const [step, setStep] = useState<KycStep>("intro");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const currentStepIndex = STEPS_ORDER.indexOf(step);
  const progress = Math.round(((currentStepIndex + 1) / STEPS_ORDER.length) * 100);

  const handleFile = (file: File | undefined, setter: (f: File | null) => void, previewSetter: (s: string | null) => void) => {
    if (!file) return;
    setter(file);
    const reader = new FileReader();
    reader.onload = (e) => previewSetter(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadToStorage = async (file: File, path: string) => {
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    if (error) throw error;
  };

  const handleFinalize = async () => {
    if (!user || !idFront) return;
    setUploading(true);
    try {
      await uploadToStorage(idFront, `${user.id}/id-front`);
      if (idBack) await uploadToStorage(idBack, `${user.id}/id-back`);
      setStep("selfie");
    } catch (e: any) {
      toast.error(t("kyc.uploadError") + " : " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSelfieSubmit = async () => {
    if (!user || !selfie) return;
    setUploading(true);
    try {
      await uploadToStorage(selfie, `${user.id}/selfie`);
      await supabase.from("profiles").update({ kyc_status: "submitted" } as any).eq("user_id", user.id);
      setStep("done");
    } catch (e: any) {
      toast.error(t("common.error") + " : " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSkipKyc = () => {
    toast.info(t("kyc.skipLater"));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Blue header */}
      <div className="relative px-6 pt-12 pb-16 text-primary-foreground overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--coly-blue-dark)))" }}>
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <div className="absolute top-16 right-6 grid grid-cols-4 gap-1.5 opacity-30">
          {Array.from({ length: 16 }).map((_, i) => (<div key={i} className="w-2 h-2 rounded-full bg-primary-foreground" />))}
        </div>
        <div className="absolute bottom-10 left-0 w-20 h-20 rounded-full bg-coly-blue-dark/50" />

        <h1 className="text-3xl font-bold relative z-10">
          {step === "intro" && t("kyc.almostDone")}
          {step === "scan" && t("kyc.almostDone")}
          {step === "review" && t("kyc.almostDone")}
          {step === "selfie" && "KYC"}
          {step === "done" && t("kyc.congrats")}
        </h1>
        <p className="text-sm mt-2 opacity-90 relative z-10">
          {step === "intro" && ""}
          {step === "scan" && t("kyc.scanDoc")}
          {step === "review" && t("kyc.createAccount")}
          {step === "selfie" && t("kyc.useServices")}
          {step === "done" && t("kyc.termsConditions")}
        </p>

        {step !== "done" && (
          <div className="mt-4 relative z-10">
            <div className="w-full h-1.5 rounded-full bg-primary-foreground/20">
              <div className="h-1.5 rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs opacity-70 mt-1">{t("kyc.step")} {currentStepIndex + 1} / {STEPS_ORDER.length - 1}</p>
          </div>
        )}
      </div>

      {/* Content card */}
      <div className="px-6 -mt-8">
        <div className="bg-card rounded-t-3xl p-6 min-h-[50vh] flex flex-col">
          {step === "intro" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="text-center mt-12">
                <h2 className="text-xl font-bold text-foreground">{t("kyc.firstSend")}</h2>
                <p className="text-foreground mt-6 text-sm leading-relaxed">{t("kyc.confirmIdentity")}</p>
                <p className="text-muted-foreground mt-4 text-xs">{t("kyc.verificationTime")}</p>
              </div>
              <div className="flex items-center justify-between mt-12">
                <button onClick={() => navigate(-1)} className="text-muted-foreground font-medium text-lg">{t("common.back")}</button>
                <div className="flex items-center gap-3">
                  {isVoyageur && (
                    <button onClick={handleSkipKyc} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline">{t("common.later")}</button>
                  )}
                  <button onClick={() => setStep("scan")} className="px-10 py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-lg shadow-lg">{t("common.next")}</button>
                </div>
              </div>
            </div>
          )}

          {step === "scan" && (
            <div className="flex-1 flex flex-col items-center justify-between">
              <div className="w-full aspect-[4/3] bg-muted rounded-2xl flex flex-col items-center justify-center mt-4 cursor-pointer overflow-hidden relative" onClick={() => frontRef.current?.click()}>
                {frontPreview ? (
                  <img src={frontPreview} alt="ID front" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={48} className="text-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t("kyc.touchToScan")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("kyc.idCard")}</p>
                  </>
                )}
                <input ref={frontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setIdFront, setFrontPreview)} />
              </div>
              <div className="flex items-center justify-between w-full mt-6">
                <button onClick={() => setStep("intro")} className="text-muted-foreground font-medium">{t("common.back")}</button>
                <button
                  onClick={() => { if (idFront) setStep("review"); else toast.error(t("kyc.scanDocument")); }}
                  className="px-8 py-3.5 rounded-2xl bg-coly-purple text-primary-foreground font-bold text-lg flex items-center gap-2"
                >
                  {t("kyc.upload")} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4 mt-2">
                {frontPreview && (
                  <div className="rounded-2xl overflow-hidden border border-border">
                    <img src={frontPreview} alt="ID Recto" className="w-full object-contain" />
                  </div>
                )}
                <div className="rounded-2xl overflow-hidden border border-border bg-muted flex items-center justify-center min-h-[140px] cursor-pointer" onClick={() => backRef.current?.click()}>
                  {backPreview ? (
                    <img src={backPreview} alt="ID Verso" className="w-full object-contain" />
                  ) : (
                    <div className="text-center py-6">
                      <Camera size={32} className="mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{t("kyc.backOptional")}</p>
                    </div>
                  )}
                  <input ref={backRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setIdBack, setBackPreview)} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-8">
                <button onClick={() => setStep("scan")} className="text-muted-foreground font-medium text-lg">{t("common.back")}</button>
                <button onClick={handleFinalize} disabled={uploading} className="px-10 py-3.5 rounded-2xl bg-coly-purple text-primary-foreground font-bold text-lg shadow-lg flex items-center gap-2 disabled:opacity-50">
                  {uploading ? t("kyc.sending") : t("kyc.finalize")} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === "selfie" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-xl font-bold text-foreground mb-2">{t("kyc.selfieTitle")}</h2>
              <p className="text-sm text-muted-foreground mb-8">{t("kyc.selfieDesc")}</p>
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden mb-6" onClick={() => selfieRef.current?.click()}>
                {selfiePreview ? (
                  <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={48} className="text-foreground" />
                )}
                <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setSelfie, setSelfiePreview)} />
              </div>
              <button onClick={() => { if (selfie) handleSelfieSubmit(); else selfieRef.current?.click(); }} disabled={uploading} className="px-12 py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-lg shadow-lg disabled:opacity-50">
                {uploading ? t("kyc.sending") : "ID NOW"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex-1 flex flex-col justify-between">
              <div className="mt-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t("kyc.identityVerified")}</h2>
                <p className="text-foreground mt-4 text-sm leading-relaxed">{t("kyc.verifiedDesc")}</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => navigate("/dashboard")} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-lg">
                  {t("kyc.goToDashboard")} <ArrowRight size={20} />
                </button>
                <button onClick={() => navigate("/send-coly")} className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-lg">
                  {t("kyc.sendParcel")} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default KycFlow;
