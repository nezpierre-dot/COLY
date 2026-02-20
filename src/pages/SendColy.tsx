import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, Star, CheckCircle2, Calendar, MapPin, Package, Image, Ruler, CreditCard, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const SIZES = [
  { id: "S", label: "S : Poids Max 1kg", dim: "217×150×50" },
  { id: "M", label: "M : Poids Max 3kg", dim: "230×130×100" },
  { id: "L", label: "L : Poids Max 5kg", dim: "315×210×157" },
  { id: "XL", label: "XL : Poids Max 7kg", dim: "383×250×195" },
  { id: "XXL", label: "XXL : Poids Max 10kg", dim: "400×425×200" },
  { id: "other", label: "Autres", dim: "" },
];

const DEPART_LABELS: Record<string, string> = {
  main: "Remis en main propre",
  address: "Récupération à une adresse",
  relay: "Dépôt en point relais",
};

const TARIF_LABELS: Record<string, string> = {
  standard: "Envoi Standard — 18.99€",
  express: "Envoi Express — 24.99€",
  custom: "Tarif personnalisé",
};

const ErrorHint = ({ message }: { message: string }) => (
  <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200">{message}</p>
);

const SendColy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 - Date
  const [date, setDate] = useState("");
  // Step 2 - Départ
  const [departMethod, setDepartMethod] = useState<string>("");
  const [departCity, setDepartCity] = useState("");
  const [relayPoint, setRelayPoint] = useState("");
  // Step 3 - Arrivée
  const [arrCity, setArrCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMail, setContactMail] = useState("");
  // Step 4 - Photo
  const [photo, setPhoto] = useState<string | null>(null);
  // Step 5 - Dimension
  const [size, setSize] = useState("S");
  // Step 6 - Tarif
  const [tarif, setTarif] = useState<string>("");
  // Step 7 - Assurance
  const [insured, setInsured] = useState<boolean | null>(null);

  const inputClass = (field: string) =>
    `w-full border-b py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-transparent transition-colors ${
      errors[field] ? "border-destructive" : "border-coly-blue/30 focus:border-coly-blue"
    }`;

  const totalSteps = 9; // 8 original + 1 summary

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!date) e.date = "Veuillez sélectionner une date";
        else {
          const d = new Date(date);
          if (d < new Date(new Date().toDateString())) e.date = "La date doit être dans le futur";
        }
        break;
      case 2:
        if (!departMethod) e.departMethod = "Veuillez choisir un mode de remise";
        if (departMethod === "address" && !departCity.trim()) e.departCity = "Adresse requise";
        if (departMethod === "relay" && !departCity.trim()) e.departCity = "Ville requise";
        if (departMethod === "relay" && !relayPoint) e.relayPoint = "Veuillez choisir un point relais";
        break;
      case 3:
        if (!arrCity.trim()) e.arrCity = "Ville d'arrivée requise";
        if (!arrCountry.trim()) e.arrCountry = "Pays d'arrivée requis";
        if (!contactNom.trim()) e.contactNom = "Nom requis";
        if (!contactPrenom.trim()) e.contactPrenom = "Prénom requis";
        if (!contactTel.trim()) e.contactTel = "Téléphone requis";
        else if (!/^[\d\s+()-]{6,20}$/.test(contactTel.trim())) e.contactTel = "Numéro invalide";
        if (contactMail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactMail.trim())) e.contactMail = "Email invalide";
        break;
      case 4:
        if (!photo) e.photo = "Veuillez prendre une photo du colis";
        break;
      case 5:
        // size always has default
        break;
      case 6:
        if (!tarif) e.tarif = "Veuillez choisir un tarif";
        break;
      case 7:
        if (insured === null) e.insured = "Veuillez faire un choix";
        break;
      case 8:
        // grille tarifaire — no validation
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
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image trop volumineuse (max 10 Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { setPhoto(reader.result as string); clearError("photo"); };
      reader.readAsDataURL(file);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition</h2>
            <div>
              <label className="text-xs text-coly-blue font-medium">Date</label>
              <input className={inputClass("date")} type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError("date"); }} />
              {errors.date ? <ErrorHint message={errors.date} /> : <span className="text-xs text-muted-foreground">DD/MM/YYYY</span>}
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition Départ</h2>
            {errors.departMethod && <ErrorHint message={errors.departMethod} />}
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "main"} onCheckedChange={() => { setDepartMethod("main"); clearError("departMethod"); }} className="mt-1" />
                <div>
                  <span className="text-foreground">Remis en main propre</span>
                  <p className="text-xs text-muted-foreground mt-1">• En cas d'impossibilité le remise en main propre sera appliqué par défaut.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "address"} onCheckedChange={() => { setDepartMethod("address"); clearError("departMethod"); }} className="mt-1" />
                <span className="text-foreground">A Venir récupérer à cette adresse :</span>
              </div>
              {departMethod === "address" && (
                <>
                  <input className={inputClass("departCity")} placeholder="Adresse de récupération" value={departCity} onChange={(e) => { setDepartCity(e.target.value); clearError("departCity"); }} />
                  {errors.departCity && <ErrorHint message={errors.departCity} />}
                </>
              )}
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "relay"} onCheckedChange={() => { setDepartMethod("relay"); clearError("departMethod"); }} className="mt-1" />
                <span className="text-foreground">Dépôt en point relais</span>
              </div>
              {departMethod === "relay" && (
                <div className="space-y-3 pl-9">
                  <input className={inputClass("departCity")} placeholder="par ville : ..." value={departCity} onChange={(e) => { setDepartCity(e.target.value); clearError("departCity"); }} />
                  {errors.departCity && <ErrorHint message={errors.departCity} />}
                  <Select value={relayPoint} onValueChange={(v) => { setRelayPoint(v); clearError("relayPoint"); }}>
                    <SelectTrigger className={`rounded-xl ${errors.relayPoint ? "border-destructive" : "border-muted"}`}>
                      <SelectValue placeholder="Points relais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relay1">Point Relais 1</SelectItem>
                      <SelectItem value="relay2">Point Relais 2</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.relayPoint && <ErrorHint message={errors.relayPoint} />}
                </div>
              )}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition Arrivée</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Ville d'Arrivée</label>
                <input className={inputClass("arrCity")} value={arrCity} onChange={(e) => { setArrCity(e.target.value); clearError("arrCity"); }} />
                {errors.arrCity && <ErrorHint message={errors.arrCity} />}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pays d'Arrivée</label>
                <input className={inputClass("arrCountry")} value={arrCountry} onChange={(e) => { setArrCountry(e.target.value); clearError("arrCountry"); }} />
                {errors.arrCountry && <ErrorHint message={errors.arrCountry} />}
              </div>
              <p className="text-sm text-muted-foreground pt-2">Contact remise en main arrivée :</p>
              <div>
                <input className={inputClass("contactNom")} placeholder="Nom" value={contactNom} onChange={(e) => { setContactNom(e.target.value); clearError("contactNom"); }} />
                {errors.contactNom && <ErrorHint message={errors.contactNom} />}
              </div>
              <div>
                <input className={inputClass("contactPrenom")} placeholder="Prénom" value={contactPrenom} onChange={(e) => { setContactPrenom(e.target.value); clearError("contactPrenom"); }} />
                {errors.contactPrenom && <ErrorHint message={errors.contactPrenom} />}
              </div>
              <div>
                <input className={inputClass("contactTel")} placeholder="Téléphone" value={contactTel} onChange={(e) => { setContactTel(e.target.value); clearError("contactTel"); }} />
                {errors.contactTel && <ErrorHint message={errors.contactTel} />}
              </div>
              <div>
                <input className={inputClass("contactMail")} placeholder="Mail (facultatif)" value={contactMail} onChange={(e) => { setContactMail(e.target.value); clearError("contactMail"); }} />
                {errors.contactMail && <ErrorHint message={errors.contactMail} />}
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Je prend en photo mon colis</h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[300px]">
              {photo ? (
                <div className="relative w-full">
                  <img src={photo} alt="Colis" className="w-full max-h-80 object-cover rounded-2xl" />
                  <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-foreground/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-64 py-5 rounded-2xl bg-coly-orange text-foreground font-medium text-lg flex items-center justify-center gap-4 hover:opacity-90 transition-opacity shadow-lg"
                >
                  <Camera size={32} className="text-foreground" />
                  <ArrowRight size={24} />
                </button>
              )}
              {errors.photo && <ErrorHint message={errors.photo} />}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>
          </>
        );

      case 5:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dimension du colis</h2>
            <p className="text-sm text-muted-foreground mb-4">(en mm)</p>
            <div className="space-y-3">
              {SIZES.map((s) => (
                <button key={s.id} onClick={() => setSize(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${size === s.id ? "bg-muted border border-foreground/20" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${size === s.id ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                      {size === s.id && <span className="text-white text-xs font-bold">✕</span>}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{s.label}</span>
                      {s.dim && <p className="text-xs text-muted-foreground ml-2">dimension : {s.dim}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        );

      case 6:
        return (
          <>
            <p className="text-sm text-muted-foreground text-center mb-8">*Le paiement est effectué à la remise du colis.</p>
            {errors.tarif && <ErrorHint message={errors.tarif} />}
            <div className="space-y-4">
              <button onClick={() => { setTarif("standard"); clearError("tarif"); }}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-all ${tarif === "standard" ? "opacity-100 ring-2 ring-coly-orange" : "opacity-80"} bg-coly-orange`}>
                <div><p>ENVOI STANDARD</p><p>18.99€</p></div>
                <ArrowRight size={24} />
              </button>
              <button onClick={() => { setTarif("express"); clearError("tarif"); }}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-all ${tarif === "express" ? "opacity-100 ring-2 ring-coly-orange" : "opacity-80"}`}
                style={{ background: "hsl(33 40% 65%)" }}>
                <div><p>ENVOI EXPRESS</p><p>24.99€</p></div>
                <ArrowRight size={24} />
              </button>
              <button onClick={() => { setTarif("custom"); clearError("tarif"); }}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-all ${tarif === "custom" ? "opacity-100 ring-2 ring-coly-orange" : "opacity-80"}`}
                style={{ background: "hsl(33 30% 55%)" }}>
                <div><p>Le tarifs ne me</p><p>conviens pas</p></div>
                <ArrowRight size={24} />
              </button>
            </div>
          </>
        );

      case 7:
        return (
          <>
            <div className="bg-muted rounded-2xl p-8 text-center mb-12">
              <p className="text-lg text-foreground leading-relaxed">
                Souhaitez vous assurer votre colis avec notre partenaire AXA assurance ?
              </p>
            </div>
            {errors.insured && <ErrorHint message={errors.insured} />}
            <div className="flex gap-4">
              <button onClick={() => { setInsured(true); clearError("insured"); }}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg text-white transition-all ${insured === true ? "opacity-100 ring-2 ring-coly-orange" : "opacity-75"} bg-coly-orange`}>
                OUI
              </button>
              <button onClick={() => { setInsured(false); clearError("insured"); }}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg text-white transition-all ${insured === false ? "opacity-100 ring-2 ring-coly-orange" : "opacity-75"} bg-coly-orange`}>
                NON
              </button>
            </div>
          </>
        );

      case 8:
        return (
          <>
            <div className="border border-border rounded-2xl p-6">
              <p className="text-sm text-muted-foreground">Comparatif</p>
              <h3 className="text-xl font-bold text-foreground mb-4">Grille Tarifaire</h3>
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Star size={18} className="text-foreground mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground">COLY : 18.99€</p>
                    <p className="text-sm text-muted-foreground">Envoi standard</p>
                  </div>
                </div>
                <div><p className="font-bold text-foreground">UPS : 24.99€</p><p className="text-sm text-muted-foreground">Envoi standard</p></div>
                <div><p className="font-bold text-foreground">FEDEX : 22.50€</p><p className="text-sm text-muted-foreground">Envoi standard</p></div>
                <div className="border-t border-border pt-4">
                  <p className="font-medium text-foreground ml-6">DHL : 12.10€</p>
                  <p className="text-sm text-muted-foreground ml-6">Envoi entre 2 à 5 jours</p>
                </div>
                <div><p className="font-bold text-foreground">ENVOI STANDARD</p><p className="text-sm text-muted-foreground">Envoi entre 12h et 48h</p></div>
              </div>
            </div>
          </>
        );

      case 9:
        // Summary screen
        const sizeObj = SIZES.find((s) => s.id === size);
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <CheckCircle2 size={24} className="text-coly-blue" />
              Récapitulatif
            </h2>
            <div className="space-y-4">
              <SummaryRow icon={Calendar} label="Date" value={new Date(date).toLocaleDateString("fr-FR")} onEdit={() => setStep(1)} />
              <SummaryRow icon={MapPin} label="Départ" value={DEPART_LABELS[departMethod] || departMethod} detail={departMethod !== "main" ? departCity : undefined} onEdit={() => setStep(2)} />
              <SummaryRow icon={MapPin} label="Arrivée" value={`${arrCity}, ${arrCountry}`} detail={`Contact: ${contactPrenom} ${contactNom} — ${contactTel}`} onEdit={() => setStep(3)} />
              <SummaryRow icon={Image} label="Photo" value={photo ? "✓ Photo ajoutée" : "Aucune"} onEdit={() => setStep(4)} />
              <SummaryRow icon={Ruler} label="Dimension" value={sizeObj?.label || size} onEdit={() => setStep(5)} />
              <SummaryRow icon={CreditCard} label="Tarif" value={TARIF_LABELS[tarif] || tarif} onEdit={() => setStep(6)} />
              <SummaryRow icon={Shield} label="Assurance" value={insured ? "Oui — AXA" : "Non"} onEdit={() => setStep(7)} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-coly-blue relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-12 pb-6">
        <h1 className="text-4xl font-bold text-white leading-tight whitespace-pre-line">
          {step === 8 ? "TARIFS" : step === 9 ? "Récapitulatif" : "j'envoi un\ncoly !"}
        </h1>
        {/* Progress bar */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-24">
        {renderStep()}

        <div className="flex items-center justify-between pt-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            {step === 9 ? "Confirmer l'envoi" : "Continuer"} <ArrowRight size={20} />
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
      <Icon size={18} className="text-coly-blue mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
    <button onClick={onEdit} className="text-xs text-coly-blue hover:underline shrink-0 ml-2">Modifier</button>
  </div>
);

export default SendColy;
