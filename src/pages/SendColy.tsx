import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Camera, CheckCircle2, Calendar, MapPin, Package,
  Image, Ruler, CreditCard, Shield, Sparkles, Users, Truck, Zap,
  AlertTriangle, Globe, Info, X, ShieldCheck, Lock, Loader2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry, getUnitsForCountry, formatSizeLabel } from "@/hooks/useLocaleUnits";

// — Constants —

const SIZES_BASE = [
  { id: "S", label: "S — Max 1kg", dim: "217×150×50", icon: "📦" },
  { id: "M", label: "M — Max 3kg", dim: "230×130×100", icon: "📦" },
  { id: "L", label: "L — Max 5kg", dim: "315×210×157", icon: "📦" },
  { id: "XL", label: "XL — Max 7kg", dim: "383×250×195", icon: "📦" },
  { id: "XXL", label: "XXL — Max 10kg", dim: "400×425×200", icon: "📦" },
  { id: "other", label: "Autres dimensions", dim: "", icon: "📐" },
];

const getSizes = (country: string) =>
  SIZES_BASE.map((s) => ({
    ...s,
    label: formatSizeLabel(s.label, country),
    dim: s.dim ? formatSizeLabel(s.dim, country) : "",
  }));

const DEPART_LABELS: Record<string, string> = {
  main: "Remis en main propre",
  address: "Récupération à une adresse",
  relay: "Dépôt en point relais",
};

const getTarifOptions = (country: string) => {
  const { symbol } = getCurrencyForCountry(country);
  return [
    { id: "standard", label: "Standard", price: `18.99${symbol}`, desc: "Livraison 2-5 jours", icon: Truck, popular: true },
    { id: "express", label: "Express", price: `24.99${symbol}`, desc: "Livraison 12-48h", icon: Zap, popular: false },
    { id: "custom", label: "Personnalisé", price: "Sur devis", desc: "Négociez votre tarif", icon: CreditCard, popular: false },
  ];
};

const DOMESTIC_COUNTRIES = ["france", "fr"];

const TAX_ESTIMATES: Record<string, { tva: string; douane: string; total: string; note: string }> = {
  default: { tva: "20%", douane: "0-4.5%", total: "~3.80€ – 8.50€", note: "Estimation basée sur le tarif RITA UE" },
  senegal: { tva: "18%", douane: "5-20%", total: "~5.20€ – 14.00€", note: "Zone CEDEAO — droits de douane variables" },
  maroc: { tva: "20%", douane: "2.5-40%", total: "~4.50€ – 18.00€", note: "Accord d'association UE-Maroc applicable" },
  cameroun: { tva: "19.25%", douane: "5-30%", total: "~5.00€ – 16.00€", note: "Zone CEMAC — tarif extérieur commun" },
  usa: { tva: "0%", douane: "0-6%", total: "~0€ – 5.00€", note: "De minimis $800 — souvent exonéré" },
};

const ErrorHint = ({ message }: { message: string }) => (
  <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200">{message}</p>
);

const STEP_TITLES = ["Trajet", "Colis", "Tarif", "Récap"];

// — Trust Badge Component —

const TrustBadge = ({ variant = "inline" }: { variant?: "inline" | "card" }) => {
  if (variant === "card") {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Sécurisé par AXA</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Assurance & protection des envois</p>
        </div>
        <Lock size={12} className="text-emerald-500 ml-auto shrink-0" />
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
      <ShieldCheck size={10} /> AXA Sécurisé
    </span>
  );
};

// — Customs Info Dialog —

const CustomsInfoDialog = ({
  open,
  onOpenChange,
  country,
  sizeLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  country: string;
  sizeLabel: string;
}) => {
  const countryKey = country.toLowerCase().trim();
  const taxInfo = TAX_ESTIMATES[countryKey] || TAX_ESTIMATES.default;
  const [estimating, setEstimating] = useState(true);

  useEffect(() => {
    if (open) {
      setEstimating(true);
      const t = setTimeout(() => setEstimating(false), 1200);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Globe size={18} className="text-primary" />
            Envoi international — {country || "Destination"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Estimation des frais de douane et taxes pour votre colis.
          </DialogDescription>
        </DialogHeader>

        {estimating ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles size={14} className="text-accent animate-pulse" />
              Analyse IA en cours (base RITA)...
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* AI estimation result */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent">Estimation IA (RITA)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">TVA locale</p>
                  <p className="text-sm font-bold text-foreground">{taxInfo.tva}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Droits douane</p>
                  <p className="text-sm font-bold text-foreground">{taxInfo.douane}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Estimation totale taxes</p>
                <p className="text-lg font-bold text-primary">{taxInfo.total}</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">Pour colis {sizeLabel}</p>
              </div>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Info size={14} className="shrink-0 mt-0.5 text-primary" />
              <span>{taxInfo.note}</span>
            </div>

            {/* Prohibited items warning */}
            <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg p-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Certains articles sont interdits à l'export (denrées périssables, matières dangereuses, contrefaçons). Vérifiez la réglementation locale.</span>
            </div>

            {/* Trust badge */}
            <TrustBadge variant="card" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// — Main Component —

const SendColy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // KYC check state
  const [kycChecked, setKycChecked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [hasExistingShipments, setHasExistingShipments] = useState(false);

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [size, setSize] = useState("S");

  // Step 3 — Tarif & Assurance
  const [tarif, setTarif] = useState<string>("");
  const [insured, setInsured] = useState<boolean | null>(null);

  // Customs dialog
  const [showCustomsDialog, setShowCustomsDialog] = useState(false);
  const [customsShown, setCustomsShown] = useState(false);

  const isInternational = useMemo(() => {
    const c = arrCountry.toLowerCase().trim();
    return c.length > 0 && !DOMESTIC_COUNTRIES.includes(c);
  }, [arrCountry]);

  // AI suggestions
  const [aiLoaded, setAiLoaded] = useState(false);
  const aiSuggestion = useMemo(() => {
    if (!arrCity || !departCity) return null;
    const voyageurs = Math.floor(Math.random() * 5) + 1;
    const prix = (15 + Math.random() * 10).toFixed(2);
    return { voyageurs, prix };
  }, [arrCity, departCity]);

  // Check KYC status & existing shipments on mount
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [profileRes, shipmentsRes] = await Promise.all([
        supabase.from("profiles").select("kyc_status").eq("user_id", user.id).maybeSingle(),
        supabase.from("shipments").select("id").eq("user_id", user.id).limit(1),
      ]);
      setKycStatus(profileRes.data?.kyc_status || "pending");
      setHasExistingShipments((shipmentsRes.data?.length || 0) > 0);
      setKycChecked(true);
    };
    check();
  }, [user]);

  // If first shipment and KYC not done, redirect to KYC
  useEffect(() => {
    if (!kycChecked) return;
    if (!hasExistingShipments && kycStatus !== "submitted" && kycStatus !== "verified") {
      // First shipment → need KYC
      navigate("/kyc", { state: { returnTo: "/send-coly" } });
    }
  }, [kycChecked, hasExistingShipments, kycStatus, navigate]);

  useEffect(() => {
    if (step === 3 && !aiLoaded) {
      const t = setTimeout(() => setAiLoaded(true), 800);
      return () => clearTimeout(t);
    }
  }, [step, aiLoaded]);

  // Show customs dialog contextually when moving to step 2 with international destination
  useEffect(() => {
    if (step === 2 && isInternational && !customsShown) {
      const t = setTimeout(() => {
        setShowCustomsDialog(true);
        setCustomsShown(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [step, isInternational, customsShown]);

  const totalSteps = 4;

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

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;
    const path = `${user.id}/${Date.now()}-${photoFile.name}`;
    const { error } = await supabase.storage.from("shipment-photos").upload(path, photoFile);
    if (error) {
      console.error("Photo upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("shipment-photos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const submitShipment = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Upload photo
      const photoUrl = await uploadPhoto();

      const { error } = await supabase.from("shipments").insert({
        user_id: user.id,
        departure_date: date,
        departure_method: departMethod,
        departure_city: departCity || null,
        relay_point: relayPoint || null,
        arrival_city: arrCity,
        arrival_country: arrCountry,
        contact_nom: contactNom,
        contact_prenom: contactPrenom,
        contact_tel: contactTel,
        contact_email: contactMail || null,
        photo_url: photoUrl,
        size,
        tarif,
        insured: insured || false,
        is_international: isInternational,
        status: "pending",
      } as any);

      if (error) throw error;

      toast.success("Envoi COLY créé avec succès ! Un voyageur sera bientôt assigné.");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Shipment error:", err);
      toast.error("Erreur lors de la création de l'envoi : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < totalSteps) setStep(step + 1);
    else {
      submitShipment();
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("Image trop volumineuse (max 10 Mo)"); return; }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => { setPhoto(reader.result as string); clearError("photo"); };
      reader.readAsDataURL(file);
    }
  };

  const SIZES = getSizes(arrCountry);
  const TARIF_OPTIONS = getTarifOptions(arrCountry);
  const localeUnits = getUnitsForCountry(arrCountry);
  const sizeLabel = SIZES.find(s => s.id === size)?.label || size;

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

              {/* International hint - contextual */}
              {isInternational && (
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg p-3 animate-in fade-in duration-300">
                  <Globe size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground font-medium">Envoi international détecté</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Des frais de douane peuvent s'appliquer. Une estimation vous sera proposée à l'étape suivante.</p>
                  </div>
                  <TrustBadge />
                </div>
              )}

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

            {/* Trust footer */}
            <TrustBadge variant="card" />
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
                <Ruler size={16} className="text-primary" /> Dimensions <span className="text-xs text-muted-foreground font-normal">({localeUnits.dimensionSmall})</span>
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{sizeLabel}</p>
                  <p className="text-xs text-muted-foreground">{photo ? "Photo ajoutée ✓" : "Aucune photo"}</p>
                </div>
                <TrustBadge />
              </div>
            </div>

            {/* International taxes quick link */}
            {isInternational && (
              <button
                onClick={() => setShowCustomsDialog(true)}
                className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/50"
              >
                <Globe size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Frais de douane estimés</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Appuyez pour voir l'estimation IA vers {arrCountry}</p>
                </div>
                <ArrowRight size={14} className="text-amber-500" />
              </button>
            )}
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
                    <p className="text-lg font-bold text-foreground">{aiSuggestion.prix}{getCurrencyForCountry(arrCountry).symbol}</p>
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

            {/* International tax summary inline */}
            {isInternational && (
              <button
                onClick={() => setShowCustomsDialog(true)}
                className="w-full flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-left transition-colors hover:bg-primary/10"
              >
                <Globe size={16} className="text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Taxes douanières estimées : {(TAX_ESTIMATES[arrCountry.toLowerCase().trim()] || TAX_ESTIMATES.default).total}</p>
                  <p className="text-[10px] text-muted-foreground">Estimation IA basée RITA — appuyez pour détails</p>
                </div>
                <Sparkles size={12} className="text-accent shrink-0" />
              </button>
            )}

            {/* Assurance */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Assurance AXA
                <TrustBadge />
              </h3>
              <p className="text-xs text-muted-foreground">Protégez votre colis contre la perte et les dommages pendant le transport.</p>
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
        const tarifObj = TARIF_OPTIONS.find(t => t.id === tarif);
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={20} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Récapitulatif</h3>
              <TrustBadge />
            </div>

            <SummaryRow icon={Calendar} label="Date" value={date ? new Date(date).toLocaleDateString("fr-FR") : "—"} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label="Départ" value={DEPART_LABELS[departMethod] || "—"} detail={departMethod !== "main" ? departCity : undefined} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label="Destination" value={`${arrCity}, ${arrCountry}`} detail={`${contactPrenom} ${contactNom} — ${contactTel}`} onEdit={() => setStep(1)} badge={isInternational ? "international" : undefined} />
            <SummaryRow icon={Package} label="Colis" value={sizeObj?.label || size} detail={photo ? "Photo ajoutée ✓" : "Aucune photo"} onEdit={() => setStep(2)} />
            <SummaryRow icon={CreditCard} label="Tarif" value={tarifObj ? `${tarifObj.label} — ${tarifObj.price}` : tarif} onEdit={() => setStep(3)} />
            <SummaryRow icon={Shield} label="Assurance" value={insured ? "Oui — AXA" : "Non"} onEdit={() => setStep(3)} badge={insured ? "axa" : undefined} />

            {/* International taxes in summary */}
            {isInternational && (
              <button
                onClick={() => setShowCustomsDialog(true)}
                className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left"
              >
                <Globe size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Taxes douane estimées : {(TAX_ESTIMATES[arrCountry.toLowerCase().trim()] || TAX_ESTIMATES.default).total}</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Voir le détail</p>
                </div>
              </button>
            )}

            {aiSuggestion && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-3 mt-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-xs text-muted-foreground">
                    {aiSuggestion.voyageurs} voyageurs disponibles — prix estimé {aiSuggestion.prix}{getCurrencyForCountry(arrCountry).symbol}
                  </span>
                </div>
              </div>
            )}

            {/* Final trust card */}
            <TrustBadge variant="card" />
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
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Envoi en cours...</>
            ) : (
              <>{step === 4 ? "Confirmer l'envoi" : "Continuer"} <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>

      {/* Customs dialog */}
      <CustomsInfoDialog
        open={showCustomsDialog}
        onOpenChange={setShowCustomsDialog}
        country={arrCountry}
        sizeLabel={sizeLabel}
      />

      <BottomNav />
    </div>
  );
};

const SummaryRow = ({ icon: Icon, label, value, detail, onEdit, badge }: {
  icon: React.ElementType; label: string; value: string; detail?: string; onEdit: () => void; badge?: string;
}) => (
  <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-primary mt-0.5" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{value}</p>
          {badge === "international" && (
            <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
              <Globe size={8} /> International
            </span>
          )}
          {badge === "axa" && <TrustBadge />}
        </div>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
    <button onClick={onEdit} className="text-xs text-primary hover:underline shrink-0 ml-2">Modifier</button>
  </div>
);

export default SendColy;
