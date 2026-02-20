import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [form, setForm] = useState<FormData>({
    nom: "", prenom: "", email: "", telephone: "",
    pays: "", ville: "", codePostal: "", region: "", adresse: "",
    password: "", confirmPassword: "", recoveryEmail: "", acceptTerms: false,
  });

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

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
            <h2 className="text-2xl font-bold text-foreground mb-6">Où êtes-vous ?</h2>
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
            <input className={inputClass} placeholder="Adresse mail de récupération" type="email" value={form.recoveryEmail} onChange={(e) => update("recoveryEmail", e.target.value)} />
            <div className="flex items-start gap-3 mt-4">
              <Checkbox checked={form.acceptTerms} onCheckedChange={(v) => update("acceptTerms", !!v)} className="mt-1" />
              <span className="text-sm text-foreground">
                Je confirme que les informations fournies sont exactes et que j'accepte les termes et conditions d'utilisation.
              </span>
            </div>
          </>
        );
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else navigate("/terms");
  };

  const { title, subtitle } = titles[step];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4 flex-1">
        {renderStep()}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            {step === 3 ? "Finaliser" : "Continuer"} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
