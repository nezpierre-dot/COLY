import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Camera, CheckCircle2, Calendar, MapPin, Package, Image, Ruler, CreditCard, Shield, Sparkles, Users, Truck, Zap, AlertTriangle, Globe, Info, X, ShieldCheck, Lock, Loader2, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry, getUnitsForCountry, formatSizeLabel } from "@/hooks/useLocaleUnits";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { localizeCountry } from "@/lib/geoLocalization";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import SearchableSelect from "@/components/SearchableSelect";
import { useRecentLocations, POPULAR_COUNTRIES } from "@/hooks/useRecentLocations";

const SIZES_BASE = [{ id: "S", label: "S — Max 1kg", dim: "217×150×50", Icon: Package }, { id: "M", label: "M — Max 3kg", dim: "230×130×100", Icon: Package }, { id: "L", label: "L — Max 5kg", dim: "315×210×157", Icon: Package }, { id: "XL", label: "XL — Max 7kg", dim: "383×250×195", Icon: Package }, { id: "XXL", label: "XXL — Max 10kg", dim: "400×425×200", Icon: Package }, { id: "other", label: "Autres dimensions", dim: "", Icon: Ruler }];
const getSizes = (country: string) => SIZES_BASE.map((s) => ({ ...s, label: formatSizeLabel(s.label, country), dim: s.dim ? formatSizeLabel(s.dim, country) : "" }));

const TAX_ESTIMATES: Record<string, { tva: string; douane: string; total: string; note: string }> = { default: { tva: "20%", douane: "0-4.5%", total: "~3.80€ – 8.50€", note: "Estimation basée sur le tarif RITA UE" } };

const ErrorHint = ({ message }: { message: string }) => <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200">{message}</p>;

const TrustBadge = ({ variant = "inline" }: { variant?: "inline" | "card" }) => {
  const { t } = useTranslation();
  if (variant === "card") return (<div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3"><div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0"><ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("coly.securedBy")}</p><p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("coly.insuranceDesc")}</p></div><Lock size={12} className="text-emerald-500 ml-auto shrink-0" /></div>);
  return (<span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full"><ShieldCheck size={10} /> {t("coly.securedBy")}</span>);
};

const CustomsInfoDialog = ({ open, onOpenChange, country, sizeLabel }: any) => {
  const { t } = useTranslation();
  const taxInfo = TAX_ESTIMATES[country.toLowerCase().trim()] || TAX_ESTIMATES.default;
  const [estimating, setEstimating] = useState(true);
  useEffect(() => { if (open) { setEstimating(true); const t = setTimeout(() => setEstimating(false), 1200); return () => clearTimeout(t); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-foreground"><Globe size={18} className="text-primary" /> {t("coly.internationalTitle")} — {country || "Destination"}</DialogTitle><DialogDescription className="text-muted-foreground">{t("coly.customsEstimate")}</DialogDescription></DialogHeader>
        {estimating ? <div className="space-y-3 py-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles size={14} className="text-accent animate-pulse" /> {t("sendcoly.analyzingTravelers")}</div><div className="space-y-2"><div className="h-4 bg-muted rounded animate-pulse" /><div className="h-4 bg-muted rounded animate-pulse w-3/4" /></div></div> : (
          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2"><Sparkles size={14} className="text-accent" /><span className="text-xs font-semibold text-accent">{t("coly.aiEstimate")}</span></div>
              <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">{t("coly.localVat")}</p><p className="text-sm font-bold text-foreground">{taxInfo.tva}</p></div><div><p className="text-xs text-muted-foreground uppercase tracking-wide">{t("coly.customsDuty")}</p><p className="text-sm font-bold text-foreground">{taxInfo.douane}</p></div></div>
              <div className="border-t border-border pt-2"><p className="text-xs text-muted-foreground uppercase tracking-wide">{t("coly.totalTaxEstimate")}</p><p className="text-lg font-bold text-primary">{taxInfo.total}</p><p className="text-xs text-muted-foreground mt-1 italic">Pour colis {sizeLabel}</p></div>
            </div>
            <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg p-3"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{t("coly.prohibitedItems")}</span></div>
            <TrustBadge variant="card" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SendColy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const countryDisplay = useCallback((v: string) => localizeCountry(v, language), [language]);
  const { recentCountries, recentCities } = useRecentLocations();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [kycChecked, setKycChecked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [hasExistingShipments, setHasExistingShipments] = useState(false);
  const [date, setDate] = useState("");
  const [departMethod, setDepartMethod] = useState<string>("");
  const [departCountry, setDepartCountry] = useState("");
  const [departCity, setDepartCity] = useState("");
  const [relayPoint, setRelayPoint] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMail, setContactMail] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [departCities, setDepartCities] = useState<string[]>([]);
  const [arrCities, setArrCities] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupAccessCode, setPickupAccessCode] = useState("");
  const [size, setSize] = useState("S");
  const [tarif, setTarif] = useState<string>("");
  const [tarifFixe, setTarifFixe] = useState("");
  const [insured, setInsured] = useState<boolean | null>(null);
  const [showCustomsDialog, setShowCustomsDialog] = useState(false);
  const [customsShown, setCustomsShown] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [createdReminderInfo, setCreatedReminderInfo] = useState<ReminderInfo | null>(null);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);
  const [showCustomsWarning, setShowCustomsWarning] = useState(false);
  const [customsWarningAccepted, setCustomsWarningAccepted] = useState(false);

  const STEP_TITLES = [t("coly.route"), t("coly.parcel"), t("coly.rate"), t("coly.recap")];
  const DEPART_LABELS: Record<string, string> = { main: t("coly.handDelivery"), address: t("coly.pickupAddress"), relay: t("coly.relayPoint") };

  const { symbol: currencySymbol } = getCurrencyForCountry(arrCountry);

  useEffect(() => { fetch("https://countriesnow.space/api/v0.1/countries").then((r) => r.json()).then((res) => { if (res?.data) setCountries(res.data.map((c: any) => c.country).sort()); }).catch(() => {}); }, []);
  const fetchCitiesFor = (country: string, setter: (c: string[]) => void) => { setter([]); if (!country) return; fetch("https://countriesnow.space/api/v0.1/countries/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country }) }).then((r) => r.json()).then((res) => { if (res?.data) setter(res.data.sort()); }).catch(() => {}); };
  const handleDepartCountryChange = (v: string) => { setDepartCountry(v); setDepartCity(""); clearError("departCountry"); fetchCitiesFor(v, setDepartCities); };
  const handleArrCountryChange = (v: string) => { setArrCountry(v); setArrCity(""); clearError("arrCountry"); fetchCitiesFor(v, setArrCities); };
  const isInternational = useMemo(() => arrCountry.toLowerCase().trim().length > 0 && !["france", "fr"].includes(arrCountry.toLowerCase().trim()), [arrCountry]);
  

  useEffect(() => { if (!user) return; const check = async () => { const [profileRes, shipmentsRes] = await Promise.all([supabase.from("profiles").select("kyc_status").eq("user_id", user.id).maybeSingle(), supabase.from("shipments").select("id").eq("user_id", user.id).limit(1)]); setKycStatus(profileRes.data?.kyc_status || "pending"); setHasExistingShipments((shipmentsRes.data?.length || 0) > 0); setKycChecked(true); }; check(); }, [user]);
  useEffect(() => { if (kycChecked && !hasExistingShipments && kycStatus !== "submitted" && kycStatus !== "verified") navigate("/kyc", { state: { returnTo: "/send-coly" } }); }, [kycChecked, hasExistingShipments, kycStatus, navigate]);
  useEffect(() => { if (step === 3 && !aiLoaded) setTimeout(() => setAiLoaded(true), 800); }, [step, aiLoaded]);
  useEffect(() => { if (step === 2 && isInternational && !customsShown) setTimeout(() => { setShowCustomsDialog(true); setCustomsShown(true); }, 500); }, [step, isInternational, customsShown]);

  const totalSteps = 4;
  const inputClass = (field: string) => `w-full border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-background transition-all ${errors[field] ? "border-destructive ring-1 ring-destructive/30" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"}`;
  const clearError = (field: string) => { if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; }); };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!date) e.date = t("coly.selectDate"); else if (new Date(date) < new Date(new Date().toDateString())) e.date = t("coly.futureDate");
        if (!departMethod) e.departMethod = t("coly.selectMethod");
        if (!departCountry.trim()) e.departCountry = t("coly.departCountryReq"); if (!departCity.trim()) e.departCity = t("coly.departCityReq");
        if (!arrCity.trim()) e.arrCity = t("coly.arrCityReq"); if (!arrCountry.trim()) e.arrCountry = t("coly.arrCountryReq");
        if (!contactNom.trim()) e.contactNom = t("coly.nameReq"); if (!contactPrenom.trim()) e.contactPrenom = t("coly.firstNameReq");
        if (!contactTel.trim()) e.contactTel = t("coly.phoneReq"); else if (!/^[\d\s+()-]{6,20}$/.test(contactTel.trim())) e.contactTel = t("sendcoly.invalidNumber");
        if (contactMail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactMail.trim())) e.contactMail = t("sendcoly.invalidEmail");
        if (!pickupAddress.trim()) e.pickupAddress = "Adresse de récupération obligatoire";
        break;
      case 2: if (!photo) e.photo = t("sendcoly.takePhoto"); break;
      case 3: if (!tarif) e.tarif = t("sendcoly.chooseTariffReq"); if (tarif === "fixe" && !tarifFixe.trim()) e.tarifFixe = "Montant obligatoire"; if (insured === null) e.insured = t("sendcoly.chooseInsurance"); break;
    }
    setErrors(e); if (Object.keys(e).length > 0) { toast.error(t("sendcoly.fillRequired")); return false; } return true;
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;
    const path = `${user.id}/${Date.now()}-${photoFile.name}`;
    const { error } = await supabase.storage.from("shipment-photos").upload(path, photoFile);
    if (error) return null;
    const { data } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 90);
    return data?.signedUrl ?? null;
  };

  const submitShipment = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const photoUrl = await uploadPhoto();
      const { data: inserted, error } = await supabase.from("shipments").insert({ user_id: user.id, departure_date: date, departure_method: departMethod, departure_city: departCity || null, relay_point: relayPoint || null, arrival_city: arrCity, arrival_country: arrCountry, contact_nom: contactNom, contact_prenom: contactPrenom, contact_tel: contactTel, contact_email: contactMail || null, photo_url: photoUrl, size, tarif: tarif === "fixe" ? `${tarifFixe} ${currencySymbol}` : "Sur devis", insured: insured || false, is_international: isInternational, status: "pending", pickup_address: pickupAddress || null, pickup_access_code: pickupAccessCode || null } as any).select("id").single();
      if (error) throw error;
      supabase.functions.invoke("notify-match", { body: { type: "shipment", record_id: inserted.id } }).catch(() => {});
      successFeedback(t("sendcoly.createdSuccess"), { description: t("sendcoly.createdDesc") });
      setCreatedReminderInfo({
        itemType: "shipment",
        itemId: inserted.id,
        departureCity: departCity || "—",
        arrivalCity: arrCity,
        departureDate: date,
      });
      setShowReminderPrompt(true);
    } catch (err: any) { toast.error(t("sendcoly.createError") + ": " + err.message); } finally { setSubmitting(false); }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 1 && !customsWarningAccepted) {
      setShowCustomsWarning(true);
      return;
    }
    if (step < totalSteps) setStep(step + 1); else submitShipment();
  };
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error(t("sendcoly.imageTooLarge")); return; }
      setPhotoFile(file); const reader = new FileReader(); reader.onload = () => { setPhoto(reader.result as string); clearError("photo"); }; reader.readAsDataURL(file);
    }
  };

  const SIZES = getSizes(arrCountry);
  const tarifDisplay = tarif === "fixe" ? `${tarifFixe} ${currencySymbol}` : tarif === "devis" ? "Sur devis" : "—";
  const localeUnits = getUnitsForCountry(arrCountry);
  const sizeLabel = SIZES.find(s => s.id === size)?.label || size;

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar size={16} className="text-primary" /> {t("sendcoly.shippingDate")}</h3><input className={inputClass("date")} type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError("date"); }} />{errors.date && <ErrorHint message={errors.date} />}</div>
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin size={16} className="text-primary" /> {t("sendcoly.departurePoint")}</h3><div><label className="text-xs text-muted-foreground mb-1 block">{t("sendcoly.departureCountry")}</label><SearchableSelect value={departCountry} onChange={handleDepartCountryChange} options={countries} placeholder={t("trip.selectCountry")} displayFn={countryDisplay} popularItems={POPULAR_COUNTRIES} recentItems={recentCountries} />{errors.departCountry && <ErrorHint message={errors.departCountry} />}</div><div><label className="text-xs text-muted-foreground mb-1 block">{t("sendcoly.departureCity")}</label><SearchableSelect value={departCity} onChange={(v: string) => { setDepartCity(v); clearError("departCity"); }} options={departCities} placeholder={departCountry ? t("trip.selectCity") : t("trip.chooseCountryFirst")} disabled={!departCountry} recentItems={recentCities} />{errors.departCity && <ErrorHint message={errors.departCity} />}</div>{errors.departMethod && <ErrorHint message={errors.departMethod} />}<div className="grid grid-cols-1 gap-2">{(["main", "address", "relay"] as const).map((m) => (<button key={m} onClick={() => { setDepartMethod(m); clearError("departMethod"); }} className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${departMethod === m ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}>{DEPART_LABELS[m]}</button>))}</div>{departMethod === "address" && (<div><input className={inputClass("departAddress")} placeholder={t("trip.departAddress")} value={departCity} onChange={(e) => { setDepartCity(e.target.value); clearError("departCity"); }} /></div>)}{departMethod === "relay" && (<div className="space-y-2"><Select value={relayPoint} onValueChange={(v) => { setRelayPoint(v); clearError("relayPoint"); }}><SelectTrigger className={`rounded-xl ${errors.relayPoint ? "border-destructive" : ""}`}><SelectValue placeholder={t("coly.relayPoint")} /></SelectTrigger><SelectContent><SelectItem value="relay1">Point Relais Centre — 2.3km</SelectItem><SelectItem value="relay2">Point Relais Gare — 3.1km</SelectItem></SelectContent></Select>{errors.relayPoint && <ErrorHint message={errors.relayPoint} />}</div>)}</div>
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin size={16} className="text-accent" /> {t("sendcoly.destinationContact")}</h3><div className="space-y-2"><div><label className="text-xs text-muted-foreground mb-1 block">{t("sendcoly.country")}</label><SearchableSelect value={arrCountry} onChange={handleArrCountryChange} options={countries} placeholder={t("trip.selectCountry")} displayFn={countryDisplay} popularItems={POPULAR_COUNTRIES} recentItems={recentCountries} />{errors.arrCountry && <ErrorHint message={errors.arrCountry} />}</div><div><label className="text-xs text-muted-foreground mb-1 block">{t("sendcoly.city")}</label><SearchableSelect value={arrCity} onChange={(v: string) => { setArrCity(v); clearError("arrCity"); }} options={arrCities} placeholder={t("trip.selectCity")} disabled={!arrCountry} recentItems={recentCities} />{errors.arrCity && <ErrorHint message={errors.arrCity} />}</div></div>{isInternational && (<div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg p-3 animate-in fade-in duration-300"><Globe size={14} className="text-primary shrink-0 mt-0.5" /><div className="flex-1"><p className="text-xs text-foreground font-medium">{t("sendcoly.internationalDetected")}</p><p className="text-xs text-muted-foreground mt-0.5">{t("sendcoly.customsMayApply")}</p></div><TrustBadge /></div>)}<div className="grid grid-cols-2 gap-2"><div><input className={inputClass("contactNom")} placeholder={t("common.name")} value={contactNom} onChange={(e) => { setContactNom(e.target.value); clearError("contactNom"); }} />{errors.contactNom && <ErrorHint message={errors.contactNom} />}</div><div><input className={inputClass("contactPrenom")} placeholder={t("common.firstName")} value={contactPrenom} onChange={(e) => { setContactPrenom(e.target.value); clearError("contactPrenom"); }} />{errors.contactPrenom && <ErrorHint message={errors.contactPrenom} />}</div></div><div><input className={inputClass("contactTel")} placeholder={t("common.phone")} value={contactTel} onChange={(e) => { setContactTel(e.target.value); clearError("contactTel"); }} />{errors.contactTel && <ErrorHint message={errors.contactTel} />}</div><div><input className={inputClass("contactMail")} placeholder={t("sendcoly.emailOptional")} value={contactMail} onChange={(e) => { setContactMail(e.target.value); clearError("contactMail"); }} />{errors.contactMail && <ErrorHint message={errors.contactMail} />}</div></div>
          {/* Pickup address fields */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin size={16} className="text-primary" /> Récupération du colis</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Adresse complète de récupération <span className="text-destructive">*</span></label>
              <input className={inputClass("pickupAddress")} placeholder="Ex : 12 rue de la Paix, 75002 Paris" value={pickupAddress} onChange={(e) => { setPickupAddress(e.target.value); clearError("pickupAddress"); }} />
              {errors.pickupAddress && <ErrorHint message={errors.pickupAddress} />}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Code d'accès / étage / interphone (optionnel)</label>
              <input className={inputClass("pickupAccessCode")} placeholder="Ex : Code 1234, 3ème étage gauche" value={pickupAccessCode} onChange={(e) => setPickupAccessCode(e.target.value)} />
            </div>
          </div>
          <TrustBadge variant="card" />
        </div>
      );
      case 2: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Camera size={16} className="text-primary" /> {t("sendcoly.photoParcel")}</h3>{photo ? (<div className="relative"><img src={photo} alt="Colis" className="w-full max-h-48 object-cover rounded-xl" /><button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full w-7 h-7 flex items-center justify-center text-sm">✕</button></div>) : (<button onClick={() => fileRef.current?.click()} className="w-full py-8 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"><Camera size={32} className="text-primary" /><span className="text-sm">{t("sendcoly.tapToPhoto")}</span></button>)}{errors.photo && <ErrorHint message={errors.photo} />}<input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} /></div>
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Ruler size={16} className="text-primary" /> {t("sendcoly.dimensions")} <span className="text-xs text-muted-foreground font-normal">({localeUnits.dimensionSmall})</span></h3><div className="grid grid-cols-2 gap-2">{SIZES.map((s) => (<button key={s.id} onClick={() => setSize(s.id)} className={`text-left px-3 py-3 rounded-xl border transition-all ${size === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/30"}`}><s.Icon size={20} className="text-primary" /><p className="text-sm font-medium text-foreground mt-1">{s.label}</p>{s.dim && <p className="text-xs text-muted-foreground">{s.dim}</p>}</button>))}</div></div>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4"><p className="text-xs text-muted-foreground mb-1">{t("sendcoly.preview")}</p><div className="flex items-center gap-3">{photo && <img src={photo} alt="" className="w-12 h-12 rounded-lg object-cover" />}<div className="flex-1"><p className="text-sm font-medium text-foreground">{sizeLabel}</p><p className="text-xs text-muted-foreground">{photo ? t("sendcoly.photoAdded") : t("sendcoly.noPhoto")}</p></div><TrustBadge /></div></div>
          {isInternational && (<button onClick={() => setShowCustomsDialog(true)} className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/50"><Globe size={16} className="text-amber-600 dark:text-amber-400 shrink-0" /><div className="flex-1"><p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t("sendcoly.customsEstimated")}</p><p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t("sendcoly.tapForEstimate")} {arrCountry}</p></div><ArrowRight size={14} className="text-amber-500" /></button>)}
        </div>
      );
      case 3: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CreditCard size={16} className="text-primary" /> {t("sendcoly.chooseTariff")}</h3>
            {errors.tarif && <ErrorHint message={errors.tarif} />}
            <div className="space-y-2">
              <button onClick={() => { setTarif("fixe"); clearError("tarif"); }} className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${tarif === "fixe" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/30"}`}>
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Tarif fixe</p>
                    <p className="text-xs text-muted-foreground">Vous définissez le prix de l'envoi</p>
                  </div>
                </div>
              </button>
              {tarif === "fixe" && (
                <div className="pl-4">
                  <div className="relative">
                    <input
                      className={`w-full border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-background transition-all pr-12 ${errors.tarifFixe ? "border-destructive ring-1 ring-destructive/30" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"}`}
                      type="number"
                      inputMode="decimal"
                      placeholder="Montant"
                      value={tarifFixe}
                      onChange={(e) => { setTarifFixe(e.target.value); if (errors.tarifFixe) { setErrors(prev => { const n = {...prev}; delete n.tarifFixe; return n; }); } }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{currencySymbol}</span>
                  </div>
                  {errors.tarifFixe && <ErrorHint message={errors.tarifFixe} />}
                </div>
              )}
              <button onClick={() => { setTarif("devis"); clearError("tarif"); }} className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${tarif === "devis" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/30"}`}>
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Sur devis</p>
                    <p className="text-xs text-muted-foreground">Le voyageur proposera un prix</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          {isInternational && (<button onClick={() => setShowCustomsDialog(true)} className="w-full flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-left transition-colors hover:bg-primary/10"><Globe size={16} className="text-primary shrink-0" /><div className="flex-1"><p className="text-xs font-semibold text-foreground">{t("sendcoly.taxesEstimated")} : {(TAX_ESTIMATES[arrCountry.toLowerCase().trim()] || TAX_ESTIMATES.default).total}</p><p className="text-xs text-muted-foreground">{t("coly.aiEstimate")} — {t("common.seeAll")}</p></div></button>)}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield size={16} className="text-primary" /> {t("sendcoly.insuranceAxa")} <TrustBadge /></h3><p className="text-xs text-muted-foreground">{t("sendcoly.protectParcel")}</p><div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg p-3"><Info size={14} className="text-primary shrink-0 mt-0.5" /><div className="text-xs text-foreground"><p className="font-medium">{t("sendcoly.optionalFee")}</p></div></div>{errors.insured && <ErrorHint message={errors.insured} />}<div className="grid grid-cols-2 gap-3"><button onClick={() => { setInsured(true); clearError("insured"); }} className={`py-3 rounded-xl border font-medium transition-all text-sm ${insured === true ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}><ShieldCheck size={14} className="inline mr-1" /> {t("sendcoly.yesInsure")}</button><button onClick={() => { setInsured(false); clearError("insured"); }} className={`py-3 rounded-xl border font-medium transition-all text-sm ${insured === false ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>{t("sendcoly.noThanks")}</button></div>{insured === true && <p className="text-xs text-primary font-medium animate-in fade-in duration-200">{t("sendcoly.coveredByAxa")}</p>}</div>
        </div>
      );
      case 4: {
        const sizeObj = SIZES.find((s) => s.id === size); const tarifObj = TARIF_OPTIONS.find(t => t.id === tarif);
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={20} className="text-primary" /><h3 className="text-lg font-bold text-foreground">{t("sendcoly.summary")}</h3><TrustBadge /></div>
            <SummaryRow icon={Calendar} label={t("common.date")} value={date ? new Date(date).toLocaleDateString("fr-FR") : "—"} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label={t("dashboard.departure")} value={DEPART_LABELS[departMethod] || "—"} detail={departMethod !== "main" ? departCity : undefined} onEdit={() => setStep(1)} />
            <SummaryRow icon={MapPin} label={t("dashboard.arrival")} value={`${arrCity}, ${arrCountry}`} detail={`${contactPrenom} ${contactNom} — ${contactTel}`} onEdit={() => setStep(1)} badge={isInternational ? "international" : undefined} />
            <SummaryRow icon={Package} label={t("coly.parcel")} value={sizeObj?.label || size} detail={photo ? t("sendcoly.photoAdded") : t("sendcoly.noPhoto")} onEdit={() => setStep(2)} />
            <SummaryRow icon={CreditCard} label={t("coly.rate")} value={tarifObj ? `${tarifObj.label} — ${tarifObj.price}` : tarif} onEdit={() => setStep(3)} />
            <SummaryRow icon={Shield} label={t("tracking.insurance")} value={insured ? `Oui — AXA` : "Non"} onEdit={() => setStep(3)} badge={insured ? "axa" : undefined} />
            {isInternational && (<button onClick={() => setShowCustomsDialog(true)} className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left"><Globe size={14} className="text-amber-600 dark:text-amber-400 shrink-0" /><div className="flex-1"><p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t("sendcoly.taxesEstimated")} : {(TAX_ESTIMATES[arrCountry.toLowerCase().trim()] || TAX_ESTIMATES.default).total}</p></div></button>)}
            {aiSuggestion && (<div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-3 mt-2"><div className="flex items-center gap-2"><Sparkles size={14} className="text-accent" /><span className="text-xs text-muted-foreground">{aiSuggestion.voyageurs} {t("sendcoly.travelers")} {t("sendcoly.available")} — {t("sendcoly.estimatedPrice")} {aiSuggestion.prix}{getCurrencyForCountry(arrCountry).symbol}</span></div></div>)}
            <TrustBadge variant="card" />
          </div>
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      <div className="bg-primary px-6 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-8 left-1/2 -translate-x-1/3 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <div className="relative z-10"><h1 className="text-2xl font-bold text-primary-foreground">{step === 4 ? t("sendcoly.summary") : t("sendcoly.title")}</h1><p className="text-primary-foreground/70 text-sm mt-1">{t("sendcoly.step")} {step}/{totalSteps} — {STEP_TITLES[step - 1]}</p><div className="flex items-center gap-2 mt-4">{STEP_TITLES.map((title, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1"><div className={`w-full h-1.5 rounded-full transition-all ${i + 1 <= step ? "bg-primary-foreground" : "bg-primary-foreground/20"}`} /><span className={`text-xs transition-colors ${i + 1 === step ? "text-primary-foreground font-semibold" : "text-primary-foreground/50"}`}>{title}</span></div>))}</div></div>
      </div>
      <div className="flex-1 px-5 pt-6 pb-28 overflow-y-auto">
        {renderStep()}
        <div className="flex items-center justify-between pt-6 mt-4">
          <button onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={16} /> {t("common.back")}</button>
          <button onClick={handleNext} disabled={submitting} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">{submitting ? <><Loader2 size={18} className="animate-spin" /> {t("sendcoly.sending")}</> : <>{step === 4 ? t("sendcoly.confirmShipment") : t("common.next")} <ArrowRight size={18} /></>}</button>
        </div>
      </div>
      <CustomsInfoDialog open={showCustomsDialog} onOpenChange={setShowCustomsDialog} country={arrCountry} sizeLabel={sizeLabel} />
      <BottomNav />

      {createdReminderInfo && (
        <ReminderDialog
          info={createdReminderInfo}
          open={showReminderPrompt}
          onOpenChange={(open) => {
            setShowReminderPrompt(open);
            if (!open) navigate("/dashboard");
          }}
        />
      )}

      <Dialog open={showCustomsWarning} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle size={20} className="text-amber-500" /> ⚠️ Informations douanières
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 leading-relaxed">
              Selon la destination, certains produits sont limités ou interdits (cigarettes max 200 unités hors UE, alcool, parfums, etc.). Vérifiez les quotas douaniers avant d'envoyer.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => { setCustomsWarningAccepted(true); setShowCustomsWarning(false); setStep(2); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm mt-2"
          >
            J'ai compris et je continue
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryRow = ({ icon: Icon, label, value, detail, onEdit, badge }: any) => (
  <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-start gap-3"><Icon size={16} className="text-primary mt-0.5" /><div><p className="text-xs text-muted-foreground">{label}</p><div className="flex items-center gap-2"><p className="text-sm font-medium text-foreground">{value}</p>{badge === "international" && <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full"><Globe size={8} /> Int.</span>}{badge === "axa" && <TrustBadge />}</div>{detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}</div></div>
    <button onClick={onEdit} className="text-xs text-primary hover:underline shrink-0 ml-2">Edit</button>
  </div>
);

export default SendColy;
