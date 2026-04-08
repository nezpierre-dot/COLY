import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import { useTranslation } from "@/hooks/useTranslation";
import { validatePassword } from "@/lib/passwordValidation";

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  pays: string;
  ville: string;
  codePostal: string;
  region: string;
  adresse: string;
  password: string;
  confirmPassword: string;
  recoveryEmail: string;
  acceptTerms: boolean;
}

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [triedNext, setTriedNext] = useState(false);
  const [form, setForm] = useState<FormData>({
    nom: "", prenom: "", email: "", telephone: "",
    pays: "", ville: "", codePostal: "", region: "", adresse: "",
    password: "", confirmPassword: "", recoveryEmail: "", acceptTerms: false,
  });

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass = (value?: string) => {
    const isEmpty = triedNext && step === 1 && value !== undefined && !value.trim();
    return `w-full border-b py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-transparent transition-colors ${isEmpty ? "border-destructive placeholder:text-destructive/60" : "border-muted-foreground/30 focus:border-coly-blue"}`;
  };

  const totalSteps = 3;

  // GPS auto-fill for step 2
  const handleGeolocate = async () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée par votre navigateur");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await resp.json();
          if (data?.address) {
            const a = data.address;
            update("pays", a.country || "");
            update("ville", a.city || a.town || a.village || "");
            update("codePostal", a.postcode || "");
            update("region", a.state || a.county || "");
            update("adresse", data.display_name?.split(",").slice(0, 2).join(",") || "");
            toast.success("Localisation détectée !");
          }
        } catch {
          toast.error("Impossible de récupérer l'adresse");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        toast.error("Accès à la localisation refusé");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const canSkipStep2 = () => {
    // Allow skip — address can be filled later
    return true;
  };

  const titles: Record<number, { title: string; subtitle: string }> = {
    1: { title: "", subtitle: t("signup.subtitle") },
    2: { title: t("signup.step2Title"), subtitle: t("signup.subtitle") },
    3: { title: "", subtitle: t("signup.subtitle") },
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">{t("signup.title")}</h2>
            <input className={inputClass(form.nom)} placeholder={`${t("common.name")} *`} value={form.nom} onChange={(e) => update("nom", e.target.value)} />
            <input className={inputClass(form.prenom)} placeholder={`${t("common.firstName")} *`} value={form.prenom} onChange={(e) => update("prenom", e.target.value)} />
            <input className={inputClass(form.email)} placeholder={`${t("common.email")} *`} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            <input className={inputClass(form.telephone)} placeholder={`${t("common.phone")} *`} type="tel" value={form.telephone} onChange={(e) => update("telephone", e.target.value)} />
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("signup.step2Heading")}</h2>

            {/* GPS auto-fill button */}
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-medium text-sm mb-1 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {geoLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              {geoLoading ? t("signup.geoDetecting") : t("signup.geolocate")}
            </button>
            <p className="text-xs text-muted-foreground text-center mb-4">
              {t("signup.geoNotice")}
            </p>

            <input className={inputClass()} placeholder={t("signup.country")} value={form.pays} onChange={(e) => update("pays", e.target.value)} />
            <div className="flex gap-4">
              <input className={`${inputClass()} flex-1`} placeholder={t("signup.city")} value={form.ville} onChange={(e) => update("ville", e.target.value)} />
              <input className={`${inputClass()} flex-1`} placeholder={t("signup.postalCode")} value={form.codePostal} onChange={(e) => update("codePostal", e.target.value)} />
            </div>
            <input className={inputClass()} placeholder={t("signup.region")} value={form.region} onChange={(e) => update("region", e.target.value)} />
            <input className={inputClass()} placeholder={t("signup.address")} value={form.adresse} onChange={(e) => update("adresse", e.target.value)} />
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">{t("signup.step3Title")}</h2>
            <div className="relative">
              <input className={inputClass()} placeholder={t("common.password")} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} />
              <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <input className={inputClass()} placeholder={t("signup.confirmPassword")} type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
              <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <input className={inputClass()} placeholder={t("signup.recoveryEmail")} type="email" value={form.recoveryEmail} onChange={(e) => update("recoveryEmail", e.target.value)} />
            <div className="flex items-start gap-3 mt-4">
              <Checkbox checked={form.acceptTerms} onCheckedChange={(v) => update("acceptTerms", !!v)} className="mt-1" />
              <span className="text-sm text-foreground">
                {t("signup.acceptTerms")}{" "}
                <button type="button" onClick={() => navigate("/terms")} className="text-primary underline">
                  {t("signup.termsLink")}
                </button>.
              </span>
            </div>
          </>
        );
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim() || !form.telephone.trim()) {
        setTriedNext(true);
        toast.error(t("signup.fillRequired"));
        return;
      }
      setTriedNext(false);
      setStep(2);
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      toast.error("Veuillez remplir vos informations personnelles");
      setStep(1);
      return;
    }

    const pwdError = validatePassword(form.password);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(t("signup.passwordMismatch"));
      return;
    }
    if (!form.acceptTerms) {
      toast.error(t("signup.acceptTermsError"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: `${form.prenom} ${form.nom}`,
          phone: form.telephone,
          pays: form.pays,
          ville: form.ville,
          code_postal: form.codePostal,
          region: form.region,
          adresse: form.adresse,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Send welcome email
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: form.email,
            subject: "🎉 Bienvenue sur Nidit !",
            html: `
              <!DOCTYPE html>
              <html lang="fr">
              <head><meta charset="utf-8"></head>
              <body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
                <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
                  <h1 style="font-size:22px;color:#111827;margin:0 0 16px;">🎉 Bienvenue sur Nidit !</h1>
                  <p style="font-size:14px;color:#374151;line-height:1.6;">
                    Bonjour ${form.prenom},
                  </p>
                  <p style="font-size:14px;color:#374151;line-height:1.6;">
                    Merci de rejoindre la communauté Nidit ! Vous pouvez maintenant envoyer des colis, créer des missions NeedIt ou devenir voyageur.
                  </p>
                  <p style="font-size:14px;color:#374151;line-height:1.6;">
                    Vérifiez votre email pour activer votre compte, puis connectez-vous pour commencer.
                  </p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="https://we-app-you.lovable.app/login" style="display:inline-block;background:#007AFF;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
                      Se connecter
                    </a>
                  </div>
                  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">— L'équipe Nidit</p>
                </div>
              </body>
              </html>
            `,
          },
        });
      } catch {
        // Silently fail — welcome email is non-critical
      }
      toast.success(t("signup.checkEmail"));
      navigate("/login");
    }
  };

  const handleSkip = () => {
    if (step === 2) {
      setStep(3);
    }
  };

  const { title, subtitle } = titles[step];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4 flex-1">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : i === step ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{step}/{totalSteps}</span>
        </div>

        {renderStep()}

        {step === 1 && (
          <>
            <div className="relative flex items-center my-2">
              <div className="flex-1 border-t border-muted-foreground/20" />
              <span className="mx-3 text-xs text-muted-foreground">ou</span>
              <div className="flex-1 border-t border-muted-foreground/20" />
            </div>
            <button
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                  extraParams: { prompt: "select_account" },
                });
                if (error) toast.error(error.message);
              }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-muted-foreground/20 bg-background text-foreground font-medium hover:bg-muted transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {t("login.continueGoogle")}
            </button>

            <button
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(error.message);
              }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-muted-foreground/20 bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              {t("login.continueApple")}
            </button>
          </>
        )}

        <div className="flex-1" />
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("common.back")}
          </button>

          <div className="flex items-center gap-3">
            {/* Skip button for step 2 */}
            {step === 2 && (
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {t("common.later")}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? "..." : step === 3 ? t("signup.finalize") : t("common.next")} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
