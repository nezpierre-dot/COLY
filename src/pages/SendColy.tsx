import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Camera, CheckCircle2, Calendar, MapPin, Package,
  Image, Ruler, CreditCard, Shield, Sparkles, Users, Truck, Zap
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";

const SIZES = [
  { id: "S", label: "S — Max 1kg", dim: "217×150×50", icon: "📦" },
  { id: "M", label: "M — Max 3kg", dim: "230×130×100", icon: "📦" },
  { id: "L", label: "L — Max 5kg", dim: "315×210×157", icon: "📦" },
  { id: "XL", label: "XL — Max 7kg", dim: "383×250×195", icon: "📦" },
  { id: "XXL", label: "XXL — Max 10kg", dim: "400×425×200", icon: "📦" },
  { id: "other", label: "Autres dimensions", dim: "", icon: "📐" },
];

const DEPART_LABELS: Record<string, string> = {
  main: "Remis en main propre",
  address: "Récupération à une adresse",
  relay: "Dépôt en point relais",
};

const TARIF_OPTIONS = [
  { id: "standard", label: "Standard", price: "18.99€", desc: "Livraison 2-5 jours", icon: Truck, popular: true },
  { id: "express", label: "Express", price: "24.99€", desc: "Livraison 12-48h", icon: Zap, popular: false },
  { id: "custom", label: "Personnalisé", price: "Sur devis", desc: "Négociez votre tarif", icon: CreditCard, popular: false },
];

const ErrorHint = ({ message }: { message: string }) => (
  <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200">{message}</p>
);

const STEP_TITLES = ["Trajet", "Colis", "Tarif", "Récap"];

const SendColy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 — Trajet
  const [date, setDate] = useState("");
  const [departMethod, setDepartMethod] = useState<string>("");
  const [departCity, setDepartCity] = useState("");
  const [relayPoint, setRelayPoint] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMail, setContactMail] = useState("");

  // Step 2 — Colis
  const [photo, setPhoto] = useState<string | null>(null);
  const [size, setSize] = useState("S");

  // Step 3 — Tarif & Assurance
  const [tarif, setTarif] = useState<string>("");
  const [insured, setInsured] = useState<boolean | null>(null);

  // AI suggestions
  const [aiLoaded, setAiLoaded] = useState(false);
  const aiSuggestion = useMemo(() => {
    if (!arrCity || !departCity) return null;
    const voyageurs = Math.floor(Math.random() * 5) + 1;
    const prix = (15 + Math.random() * 10).toFixed(2);
    return { voyageurs, prix };
  }, [arrCity, departCity]);

  useEffect(() => {
    if (step === 3 && !aiLoaded) {
      const t = setTimeout(() => setAiLoaded(true), 800);
      return () => clearTimeout(t);
    }
  }, [step, aiLoaded]);

  const totalSteps = 4;
  const progressPercent = (step / totalSteps) * 100;

  const inputClass = (field: string) =>
    `w-full border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-background transition-all ${
      errors[field] ? "border-destructive ring-1 ring-destructive/30" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
    }`;

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!date) e.date = "Veuillez sélectionner une date";
        else if (new Date(date) < new Date(new Date().toDateString())) e.date = "La date doit être dans le futur";
        if (!departMethod) e.departMethod = "Choisissez un mode de remise";
        if (departMethod === "address" && !departCity.trim()) e.departCity = "Adresse requise";
        if (departMethod === "relay" && !departCity.trim()) e.departCity = "Ville requise";
        if (departMethod === "relay" && !relayPoint) e.relayPoint = "Choisissez un point relais";
        if (!arrCity.trim()) e.arrCity = "Ville d'arrivée requise";
        if (!arrCountry.trim()) e.arrCountry = "Pays d'arrivée requis";
        if (!contactNom.trim()) e.contactNom = "Nom requis";
        if (!contactPrenom.trim()) e.contactPrenom = "Prénom requis";
        if (!contactTel.trim()) e.contactTel = "Téléphone requis";
        else if (!/^[\d\s+()-]{6,20}$/.test(contactTel.trim())) e.contactTel = "Numéro invalide";
        if (contactMail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactMail.trim())) e.contactMail = "Email invalide";
        break;
      case 2:
        if (!photo) e.photo = "Prenez une photo du colis";
        break;
      case 3:
        if (!tarif) e.tarif = "Choisissez un tarif";
        if (insured === null) e.insured = "Choisissez une option d'assurance";
        break;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Veuillez compléter les champs requis");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < totalSteps) setStep(step + 1);
    else {
      toast.success("Envoi COLY confirmé !");
      navigate("/dashboard");
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("Image trop volumineuse (max 10 Mo)"); return; }
      const reader = new FileReader();
      reader.onload = () => { setPhoto(reader.result as string); clearError("photo"); };
      reader.readAsDataURL(file);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Date */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar size={16} className="text-primary" /> Date d'expédition
              </h3>
              <input className={inputClass("date")} type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError("date"); }} />
              {errors.date && <ErrorHint message={errors.date} />}
            </div>

            {/* Départ */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-primary" /> Point de départ
              </h3>
              {errors.departMethod && <ErrorHint message={errors.departMethod} />}
              <div className="grid grid-cols-1 gap-2">
                {(["main", "address", "relay"] as const).map((m) => (
                  <button key={m} onClick={() => { setDepartMethod(m); clearError("departMethod"); }}
                    className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                      departMethod === m ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}>
                    {DEPART_LABELS[m]}
                  </button>
                ))}
              </div>
              {departMethod === "address" && (
                <div>
                  <input className={inputClass("departCity")} placeholder="Adresse de récupération" value={departCity} onChange={(e) => { setDepartCity(e.target.value); clearError("departCity"); }} />
                  {errors.departCity && <ErrorHint message={errors.departCity} />}
                </div>
              )}
              {departMethod === "relay" && (
                <div className="space-y-2">
                  <input className={inputClass("departCity")} placeholder="Ville..." value={departCity} onChange={(e) => { setDepartCity(e.target.value); clearError("departCity"); }} />
                  {errors.departCity && <ErrorHint message={errors.departCity} />}
                  <Select value={relayPoint} onValueChange={(v) => { setRelayPoint(v); clearError("relayPoint"); }}>
                    <SelectTrigger className={`rounded-xl ${errors.relayPoint ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Choisir un point relais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relay1">Point Relais Centre — 2.3km</SelectItem>
                      <SelectItem value="relay2">Point Relais Gare — 3.1km</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.relayPoint && <ErrorHint message={errors.relayPoint} />}
                </div>
              )}
            </div>

            {/* Arrivée */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-accent" /> Destination & Contact
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input className={inputClass("arrCity")} placeholder="Ville" value={arrCity} onChange={(e) => { setArrCity(e.target.value); clearError("arrCity"); }} />
                  {errors.arrCity && <ErrorHint message={errors.arrCity} />}
                </div>
                <div>
                  <input className={inputClass("arrCountry")} placeholder="Pays" value={arrCountry} onChange={(e) => { setArrCountry(e.target.value); clearError("arrCountry"); }} />
                  {errors.arrCountry && <ErrorHint message={errors.arrCountry} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input className={inputClass("contactNom")} placeholder="Nom" value={contactNom} onChange={(e) => { setContactNom(e.target.value); clearError("contactNom"); }} />
                  {errors.contactNom && <ErrorHint message={errors.contactNom} />}
                </div>
                <div>
                  <input className={inputClass("contactPrenom")} placeholder="Prénom" value={contactPrenom} onChange={(e) => { setContactPrenom(e.target.value); clearError("contactPrenom"); }} />
                  {errors.contactPrenom && <ErrorHint message={errors.contactPrenom} />}
                </div>
              </div>
              <div>
                <input className={inputClass("contactTel")} placeholder="Téléphone" value={contactTel} onChange={(e) => { setContactTel(e.target.value); clearError("contactTel"); }} />
                {errors.contactTel && <ErrorHint message={errors.contactTel} />}
              </div>
              <div>
                <input className={inputClass("contactMail")} placeholder="Email (facultatif)" value={contactMail} onChange={(e) => { setContactMail(e.target.value); clearError("contactMail"); }} />
                {errors.contactMail && <ErrorHint message={errors.contactMail} />}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Photo */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera size={16} className="text-primary" /> Photo du colis
              </h3>
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Colis" className="w-full max-h-48 object-cover rounded-xl" />
                  <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Camera size={32} className="text-primary" />
                  <span className="text-sm">Appuyez pour photographier</span>
                </button>
              )}
              {errors.photo && <ErrorHint message={errors.photo} />}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Dimensions */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Ruler size={16} className="text-primary" /> Dimensions <span className="text-xs text-muted-foreground font-normal">(mm)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SIZES.map((s) => (
                  <button key={s.id} onClick={() => setSize(s.id)}
                    className={`text-left px-3 py-3 rounded-xl border transition-all ${
                      size === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/30"
                    }`}>
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-sm font-medium text-foreground mt-1">{s.label}</p>
                    {s.dim && <p className="text-[11px] text-muted-foreground">{s.dim}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Aperçu</p>
              <div className="flex items-center gap-3">
                {photo && <img src={photo} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{SIZES.find(s => s.id === size)?.label || size}</p>
                  <p className="text-xs text-muted-foreground">{photo ? "Photo ajoutée ✓" : "Aucune photo"}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* AI Suggestion */}
            {aiSuggestion && aiLoaded && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-accent" />
                  <span className="text-xs font-semibold text-accent">Suggestion IA</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      <Users size={14} className="text-primary" />
                      <span className="font-semibold">{aiSuggestion.voyageurs} voyageurs</span>
                      <span className="text-muted-foreground">disponibles</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{aiSuggestion.prix}€</p>
                    <p className="text-[11px] text-muted-foreground">prix estimé</p>
                  </div>
                </div>
              </div>
            )}
            {aiSuggestion && !aiLoaded && (
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                <Sparkles size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analyse des voyageurs disponibles...</span>
              </div>
            )}

            {/* Tarifs */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard size={16} className="text-primary" /> Choisir un tarif
              </h3>
              {errors.tarif && <ErrorHint message={errors.tarif} />}
              <div className="space-y-2">
                {TARIF_OPTIONS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => { setTarif(t.id); clearError("tarif"); }}
                      className={`w-full text-left px-4 py-4 rounded-xl border transition-all relative ${
                        tarif === t.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/30"
                      }`}>
                      {t.popular && (
                        <span className="absolute -top-2 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Populaire
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon size={20} className="text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground">{t.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">*Le paiement est effectué à la remise du colis.</p>
            </div>

            {/* Assurance */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Assurance AXA
              </h3>
              {errors.insured && <ErrorHint message={errors.insured} />}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setInsured(true); clearError("insured"); }}
                  className={`py-3 rounded-xl border font-medium transition-all ${
                    insured === true ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}>
                  Oui, assurer
                </button>
                <button onClick={() => { setInsured(false); clearError("insured"); }}
                  className={`py-3 rounded-xl border font-medium transition-all ${
                    insured === false ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}>
                  Non merci
                </button>
              </div>
            </div>
          </div>
        );

      case 4: {
        const sizeObj = SIZES.find((s) => s.id === size);
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={20} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Récapitulatif</h3>
            </div>

            <SummaryRow icon={Calendar} label="Date" value={date ? new Date(date).toLocaleDateString("fr-FR") : "—"} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label="Départ" value={DEPART_LABELS[departMethod] || "—"} detail={departMethod !== "main" ? departCity : undefined} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label="Destination" value={`${arrCity}, ${arrCountry}`} detail={`${contactPrenom} ${contactNom} — ${contactTel}`} onEdit={() => setStep(1)} />
            <SummaryRow icon={Package} label="Colis" value={sizeObj?.label || size} detail={photo ? "Photo ajoutée ✓" : "Aucune photo"} onEdit={() => setStep(2)} />
            <SummaryRow icon={CreditCard} label="Tarif" value={TARIF_OPTIONS.find(t => t.id === tarif)?.label + " — " + TARIF_OPTIONS.find(t => t.id === tarif)?.price || tarif} onEdit={() => setStep(3)} />
            <SummaryRow icon={Shield} label="Assurance" value={insured ? "Oui — AXA" : "Non"} onEdit={() => setStep(3)} />

            {aiSuggestion && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-3 mt-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-xs text-muted-foreground">
                    {aiSuggestion.voyageurs} voyageurs disponibles — prix estimé {aiSuggestion.prix}€
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-6 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-8 left-1/2 -translate-x-1/3 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-primary-foreground">
            {step === 4 ? "Récapitulatif" : "Envoyer un Coly"}
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            Étape {step}/{totalSteps} — {STEP_TITLES[step - 1]}
          </p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {STEP_TITLES.map((title, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-1.5 rounded-full transition-all ${
                  i + 1 <= step ? "bg-primary-foreground" : "bg-primary-foreground/20"
                }`} />
                <span className={`text-[10px] transition-colors ${
                  i + 1 === step ? "text-primary-foreground font-semibold" : "text-primary-foreground/50"
                }`}>{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-6 pb-28 overflow-y-auto">
        {renderStep()}

        <div className="flex items-center justify-between pt-6 mt-4">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            {step === 4 ? "Confirmer l'envoi" : "Continuer"} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const SummaryRow = ({ icon: Icon, label, value, detail, onEdit }: {
  icon: React.ElementType; label: string; value: string; detail?: string; onEdit: () => void;
}) => (
  <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-primary mt-0.5" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
    <button onClick={onEdit} className="text-xs text-primary hover:underline shrink-0 ml-2">Modifier</button>
  </div>
);

export default SendColy;
