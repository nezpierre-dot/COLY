import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";

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
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    nom: "", prenom: "", email: "", telephone: "",
    pays: "", ville: "", codePostal: "", region: "", adresse: "",
    password: "", confirmPassword: "", recoveryEmail: "", acceptTerms: false,
  });

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

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
    1: { title: "", subtitle: "Créez votre compte pour commencer à partager le trajet." },
    2: { title: "Plus qu'une étape !", subtitle: "Créez votre compte pour commencer à partager le trajet." },
    3: { title: "", subtitle: "Créez votre compte pour commencer à partager le trajet." },
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Inscrivez-vous</h2>
            <input className={inputClass} placeholder="Nom" value={form.nom} onChange={(e) => update("nom", e.target.value)} />
            <input className={inputClass} placeholder="Prénom" value={form.prenom} onChange={(e) => update("prenom", e.target.value)} />
            <input className={inputClass} placeholder="Adresse Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            <input className={inputClass} placeholder="Numéro de téléphone" type="tel" value={form.telephone} onChange={(e) => update("telephone", e.target.value)} />
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Où êtes-vous ?</h2>

            {/* GPS auto-fill button */}
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-medium text-sm mb-4 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {geoLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
              {geoLoading ? "Détection en cours..." : "Utiliser ma position GPS"}
            </button>

            <input className={inputClass} placeholder="Pays de résidence" value={form.pays} onChange={(e) => update("pays", e.target.value)} />
            <div className="flex gap-4">
              <input className={`${inputClass} flex-1`} placeholder="Ville" value={form.ville} onChange={(e) => update("ville", e.target.value)} />
              <input className={`${inputClass} flex-1`} placeholder="Code postal" value={form.codePostal} onChange={(e) => update("codePostal", e.target.value)} />
            </div>
            <input className={inputClass} placeholder="Région/Département" value={form.region} onChange={(e) => update("region", e.target.value)} />
            <input className={inputClass} placeholder="Adresse postale" value={form.adresse} onChange={(e) => update("adresse", e.target.value)} />
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Protégez votre compte</h2>
            <div className="relative">
              <input className={inputClass} placeholder="Mot de passe" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} />
              <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <input className={inputClass} placeholder="Confirmez votre mot de passe" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
              <button type="button" className="absolute right-0 top-3 text-coly-purple" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <input className={inputClass} placeholder="Adresse mail de récupération (facultatif)" type="email" value={form.recoveryEmail} onChange={(e) => update("recoveryEmail", e.target.value)} />
            <div className="flex items-start gap-3 mt-4">
              <Checkbox checked={form.acceptTerms} onCheckedChange={(v) => update("acceptTerms", !!v)} className="mt-1" />
              <span className="text-sm text-foreground">
                Je confirme que les informations fournies sont exactes et que j'accepte les{" "}
                <button type="button" onClick={() => navigate("/terms")} className="text-primary underline">
                  termes et conditions d'utilisation
                </button>.
              </span>
            </div>
          </>
        );
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      toast.error("Veuillez remplir vos informations personnelles");
      setStep(1);
      return;
    }

    if (form.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (!form.acceptTerms) {
      toast.error("Veuillez accepter les conditions d'utilisation");
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
      toast.success("Vérifiez votre email pour confirmer votre inscription !");
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
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>

          <div className="flex items-center gap-3">
            {/* Skip button for step 2 */}
            {step === 2 && (
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Plus tard
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
            >
              {loading ? "..." : step === 3 ? "Finaliser" : "Continuer"} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
