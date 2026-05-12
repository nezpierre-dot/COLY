/**
 * SendWizard — Assistant pas-à-pas du CTA Envoyer (Refonte V11).
 * UX V11 : Skeleton loader au mount, cards tons colorés + glow,
 * bouton Continuer gradient quand actif, label Passer (optionnel),
 * bande de garanties (KYC/paiement bloqué/code/assurance 500), haptic différencié.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Package, ShoppingBag, MapPin, Calendar,
  CheckCircle2, SkipForward, AlertCircle, Loader2, LocateFixed,
  ShieldCheck, Lock, KeyRound, Heart,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";
import { haptic as hapticV4 } from "@/hooks/useHaptic";
import { trackEvent } from "@/lib/analytics";
import {
  searchPlaces, reverseGeocode, requestUserLocation, normalizePlaceText,
  type PlaceSuggestion,
} from "@/lib/placeSearch";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { SkeletonText, SkeletonCard } from "@/components/ui/SkeletonCard";

type SendType = "parcel" | "needit";

const STORAGE_PREFIX = "nidit:draft:";
const SEND_COLY_KEY = STORAGE_PREFIX + "send-coly";

const NAME_REGEX = /^[\p{L}\p{M}0-9 ,.'’\-]+$/u;
const FORBIDDEN_REGEX = /[<>{}\\^`|\u0000-\u001F\u007F]/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const placeField = (errReq: string, errFmt: string, errBad: string) =>
  z.string().trim().min(2, errReq).max(80, errFmt)
    .refine((v) => !FORBIDDEN_REGEX.test(v), errBad)
    .refine((v) => NAME_REGEX.test(v), errFmt);

const stepSchemas = {
  origin: z.object({
    departCountry: placeField("originCountryReq", "originCountryFmt", "originCountryBad"),
    departCity: placeField("originCityReq", "originCityFmt", "originCityBad"),
  }),
  destination: z.object({
    arrCountry: placeField("destCountryReq", "destCountryFmt", "destCountryBad"),
    arrCity: placeField("destCityReq", "destCityFmt", "destCityBad"),
  }),
  date: z.object({
    date: z.string().min(1, "dateReq").regex(ISO_DATE_REGEX, "dateFmt")
      .refine((v) => { const d = new Date(v); return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString()); }, "dateFuture")
      .refine((v) => { const d = new Date(v); const max = new Date(); max.setDate(max.getDate() + 365); return d <= max; }, "dateTooFar"),
  }),
};

type FieldErrors = Record<string, string>;

const TRUST_PILLS = [
  { icon: ShieldCheck, label: "Voyageur KYC" },
  { icon: Lock, label: "Paiement bloqué" },
  { icon: KeyRound, label: "Code de remise" },
  { icon: Heart, label: "Assurance 500 €" },
];

const TrustBar = () => (
  <section aria-label="Garanties Nidit" className="mt-8 mx-1 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 text-center">Tes garanties Nidit</p>
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {TRUST_PILLS.map((p) => {
        const Icon = p.icon;
        return (
          <li key={p.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-primary/5">
            <Icon size={12} className="text-primary shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-medium text-foreground truncate">{p.label}</span>
          </li>
        );
      })}
    </ul>
  </section>
);

const StepSkeleton = () => (
  <div className="space-y-4 mt-6">
    <SkeletonText lines={1} className="max-w-[60%]" />
    <SkeletonCard withAvatar={false} />
  </div>
);

const SendWizard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState(1);
  const [type, setType] = useState<SendType | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [departCountry, setDepartCountry] = useState("");
  const [departCity, setDepartCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    trackEvent("send_wizard_view", "navigation");
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    trackEvent("send_wizard_step", "navigation", { step });
    headingRef.current?.focus();
  }, [step]);

  const validateStep = (target: 1 | 2 | 3 | 4 = step): FieldErrors => {
    if (target === 1) return type ? {} : { type: "typeReq" };
    const schemaMap = { 2: stepSchemas.origin, 3: stepSchemas.destination, 4: stepSchemas.date } as const;
    const dataMap = { 2: { departCountry, departCity }, 3: { arrCountry, arrCity }, 4: { date } } as const;
    const result = schemaMap[target].safeParse(dataMap[target]);
    const next: FieldErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
    }
    if (target === 3 && departCity.trim() && arrCity.trim() && departCountry.trim() && arrCountry.trim()) {
      const same = departCity.trim().toLowerCase() === arrCity.trim().toLowerCase() && departCountry.trim().toLowerCase() === arrCountry.trim().toLowerCase();
      if (same && !next.arrCity) next.arrCity = "sameAsOrigin";
    }
    return next;
  };

  const liveErrors = useMemo(() => validateStep(step), [step, type, departCountry, departCity, arrCountry, arrCity, date]);

  const showError = (field: string): string | null => {
    if (!touched[field]) return null;
    const msg = liveErrors[field] || errors[field];
    return msg ? t(`sendWizard.err.${msg}`) : null;
  };

  const stepIsValid = Object.keys(liveErrors).length === 0;
  const canContinue = stepIsValid || Object.keys(touched).length === 0;

  const goNext = () => {
    const fields = step === 1 ? ["type"] : step === 2 ? ["departCountry", "departCity"] : step === 3 ? ["arrCountry", "arrCity"] : ["date"];
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((f) => [f, true])) }));
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { try { hapticV4("warning"); } catch {} return; }
    hapticLight();
    try { hapticV4(step === 4 ? "success" : "selection"); } catch {}
    if (step === 1 && type === "needit") { trackEvent("send_wizard_pick_type", "navigation", { type }); navigate("/needit/categories"); return; }
    if (step === 4) { finishToSendColy(); return; }
    setDirection(1);
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const goBack = () => {
    if (step === 1) { navigate(-1); return; }
    setDirection(-1);
    setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  const skipToSendColy = () => { trackEvent("send_wizard_skip", "navigation", { from_step: step }); finishToSendColy(); };

  const finishToSendColy = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(SEND_COLY_KEY) || "null");
      const merged = {
        data: { ...(existing?.data || {}), ...(departCountry && { departCountry }), ...(departCity && { departCity }), ...(arrCountry && { arrCountry }), ...(arrCity && { arrCity }), ...(date && { date }) },
        updatedAt: Date.now(),
      };
      localStorage.setItem(SEND_COLY_KEY, JSON.stringify(merged));
    } catch {}
    trackEvent("send_wizard_complete", "navigation", { hasCountry: !!departCountry, hasCity: !!departCity, hasArr: !!arrCity, hasDate: !!date });
    navigate("/send-coly");
  };

  const STEP_LABELS = [t("sendWizard.step.type"), t("sendWizard.step.origin"), t("sendWizard.step.destination"), t("sendWizard.step.date")];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-32">
        <header className="px-5 pt-5 pb-3 flex items-center gap-2">
          <button onClick={goBack} aria-label={t("common.back")} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary outline-none">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{t("sendChoice.headerTitle")}</h1>
          {step > 1 && (
            <button onClick={skipToSendColy} aria-label="Passer cette étape (optionnel)" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-md px-2 py-1">
              <SkipForward size={14} /> Passer <span className="text-[10px] opacity-70">(optionnel)</span>
            </button>
          )}
        </header>

        <div className="px-5 pb-4">
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full h-1.5 rounded-full transition-all ${done || active ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
                  <span className={`text-[10px] sm:text-xs transition-colors ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <main className="px-5">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-foreground leading-tight outline-none">
            {step === 1 && t("sendWizard.q.type")}
            {step === 2 && t("sendWizard.q.origin")}
            {step === 3 && t("sendWizard.q.destination")}
            {step === 4 && t("sendWizard.q.date")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && t("sendChoice.subtitle")}
            {step === 2 && t("sendWizard.hint.origin")}
            {step === 3 && t("sendWizard.hint.destination")}
            {step === 4 && t("sendWizard.hint.date")}
          </p>

          <div aria-live="assertive" className="sr-only">{Object.values(errors).map((e) => t(`sendWizard.err.${e}`)).join(". ")}</div>

          {!hydrated ? (<StepSkeleton />) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={step} initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }} transition={{ duration: 0.22 }} className="mt-6">
                {step === 1 && (<TypeStep value={type} onChange={(v) => { setType(v); setTouched((p) => ({ ...p, type: true })); try { hapticV4("selection"); } catch {} }} />)}
                {step === 2 && (<CityCountryStep icon={<MapPin size={18} />} countryLabel={t("sendWizard.label.country")} cityLabel={t("sendWizard.label.city")} countryPh={t("sendWizard.ph.originCountry")} cityPh={t("sendWizard.ph.originCity")} country={departCountry} city={departCity} setCountry={(v) => { setDepartCountry(v); setTouched((p) => ({ ...p, departCountry: true })); }} setCity={(v) => { setDepartCity(v); setTouched((p) => ({ ...p, departCity: true })); }} countryErr={showError("departCountry")} cityErr={showError("departCity")} />)}
                {step === 3 && (<CityCountryStep icon={<MapPin size={18} />} countryLabel={t("sendWizard.label.country")} cityLabel={t("sendWizard.label.city")} countryPh={t("sendWizard.ph.destCountry")} cityPh={t("sendWizard.ph.destCity")} country={arrCountry} city={arrCity} setCountry={(v) => { setArrCountry(v); setTouched((p) => ({ ...p, arrCountry: true })); }} setCity={(v) => { setArrCity(v); setTouched((p) => ({ ...p, arrCity: true })); }} countryErr={showError("arrCountry")} cityErr={showError("arrCity")} />)}
                {step === 4 && (<DateStep value={date} onChange={(v) => { setDate(v); setTouched((p) => ({ ...p, date: true })); }} err={showError("date")} />)}
              </motion.div>
            </AnimatePresence>
          )}

          {hydrated && <TrustBar />}
        </main>

        <div className="fixed bottom-20 left-0 right-0 px-5 z-20">
          <button onClick={goNext} disabled={!canContinue} aria-disabled={!canContinue} className={["w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all outline-none", "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background", canContinue ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"].join(" ")}>
            {step === 4 ? (<><CheckCircle2 size={18} /> {t("sendWizard.finish")}</>) : (<>{t("common.next")} <ArrowRight size={18} /></>)}
          </button>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

const TYPE_TONES = {
  parcel: { bg: "from-primary/15 to-primary/5", selectedBg: "from-primary/25 to-primary/10", iconBg: "bg-primary/15", iconColor: "text-primary", selectedRing: "ring-primary" },
  needit: { bg: "from-secondary/15 to-secondary/5", selectedBg: "from-secondary/25 to-secondary/10", iconBg: "bg-secondary/20", iconColor: "text-secondary-foreground", selectedRing: "ring-secondary" },
} as const;

const TypeStep = ({ value, onChange }: { value: SendType | null; onChange: (v: SendType) => void; }) => {
  const { t } = useTranslation();
  const choices: Array<{ key: SendType; title: string; subtitle: string; example: string; Icon: typeof Package; }> = [
    { key: "parcel", title: t("sendChoice.parcelTitle"), subtitle: t("sendChoice.parcelSubtitle"), example: t("sendChoice.parcelExample"), Icon: Package },
    { key: "needit", title: t("sendChoice.needitTitle"), subtitle: t("sendChoice.needitSubtitle"), example: t("sendChoice.needitExample"), Icon: ShoppingBag },
  ];
  return (
    <div role="radiogroup" aria-label={t("sendChoice.groupAria")} className="space-y-3">
      {choices.map((c, idx) => {
        const selected = value === c.key;
        const Icon = c.Icon;
        const tone = TYPE_TONES[c.key];
        return (
          <motion.button key={c.key} role="radio" aria-checked={selected} whileTap={{ scale: 0.98 }} autoFocus={idx === 0 && value === null} onClick={() => onChange(c.key)}
            className={[
              "w-full text-left rounded-2xl p-4 border transition-all outline-none relative overflow-hidden",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "bg-gradient-to-br",
              selected ? `${tone.selectedBg} border-transparent shadow-lg ring-2 ${tone.selectedRing}` : `${tone.bg} border-border hover:border-primary/40 hover:shadow-md`,
            ].join(" ")}>
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tone.iconBg}`}>
                <Icon size={24} className={tone.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">{c.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{c.subtitle}</p>
                <span className="inline-block mt-2 text-[11px] font-medium text-foreground/70 bg-background/60 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-border/40">{c.example}</span>
              </div>
              {selected && (<CheckCircle2 size={22} className="text-primary shrink-0 mt-1" />)}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

const Field = ({ label, required, error, children, htmlFor, hintId, hint }: { label: string; required?: boolean; error?: string | null; children: React.ReactNode; htmlFor: string; hintId?: string; hint?: string; }) => {
  const errorId = `${htmlFor}-err`;
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && (<span className="text-destructive" aria-hidden="true">*</span>)}
        {required && <span className="sr-only"> (obligatoire)</span>}
      </label>
      {children}
      {hint && !error && (<p id={hintId} className="text-xs text-muted-foreground mt-1">{hint}</p>)}
      {error && (
        <p id={errorId} className="text-xs text-destructive mt-1 flex items-start gap-1 animate-in fade-in slide-in-from-top-1 duration-200" role="alert" aria-live="polite">
          <AlertCircle size={12} aria-hidden="true" className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

const inputBase = (hasErr: boolean) =>
  `w-full border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground bg-background focus:outline-none transition-all ${hasErr ? "border-destructive ring-1 ring-destructive/30" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"}`;

export const CityCountryStep = ({ icon, countryLabel, cityLabel, countryPh, cityPh, country, city, setCountry, setCity, countryErr, cityErr }: {
  icon: React.ReactNode; countryLabel: string; cityLabel: string; countryPh: string; cityPh: string;
  country: string; city: string; setCountry: (v: string) => void; setCity: (v: string) => void; countryErr: string | null; cityErr: string | null;
}) => {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const applySuggestion = (s: PlaceSuggestion) => { if (s.country) setCountry(s.country); if (s.city) setCity(s.city); hapticLight(); };
  const handleUseCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    trackEvent("send_wizard_use_location", "navigation");
    try {
      const pos = await requestUserLocation();
      const place = await reverseGeocode(pos.coords.longitude, pos.coords.latitude);
      if (place && (place.city || place.country)) { applySuggestion(place); toast.success(t("sendWizard.useLocationOk", { label: place.label || place.city })); }
      else toast.error(t("sendWizard.useLocationFailed"));
    } catch (err: any) {
      const code = err?.code;
      if (code === 1) toast.error(t("sendWizard.useLocationDenied"));
      else if (err?.message === "geolocation_unavailable") toast.error(t("sendWizard.useLocationUnavailable"));
      else toast.error(t("sendWizard.useLocationFailed"));
    } finally { setLocating(false); }
  };
  return (
    <div className="space-y-4">
      <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-0.5 outline-none" aria-label={t("sendWizard.useLocation")}>
        {locating ? (<Loader2 size={14} className="animate-spin" aria-hidden="true" />) : (<LocateFixed size={14} aria-hidden="true" />)}
        {locating ? t("sendWizard.useLocationLoading") : t("sendWizard.useLocation")}
      </button>
      <Field label={cityLabel} required error={cityErr} htmlFor="wiz-city">
        <PlaceAutocompleteInput id="wiz-city" value={city} onChange={(v) => setCity(v)} onPick={applySuggestion} placeholder={cityPh} hasError={!!cityErr} autoFocus autoComplete="address-level2" enterKeyHint="next" countryFilter={country} icon={icon} />
      </Field>
      <Field label={countryLabel} required error={countryErr} htmlFor="wiz-country">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">{icon}</span>
          <input id="wiz-country" value={country} onChange={(e) => setCountry(e.target.value)} onBlur={(e) => setCountry(normalizePlaceText(e.target.value))} placeholder={countryPh} className={inputBase(!!countryErr) + " pl-10"} aria-invalid={!!countryErr} aria-required="true" aria-describedby={countryErr ? "wiz-country-err" : undefined} autoComplete="country-name" maxLength={80} enterKeyHint="next" spellCheck={false} />
        </div>
      </Field>
    </div>
  );
};

export const PlaceAutocompleteInput = ({ id, value, onChange, onPick, placeholder, hasError, autoFocus, autoComplete, enterKeyHint, icon, countryFilter }: {
  id: string; value: string; onChange: (v: string) => void; onPick: (s: PlaceSuggestion) => void; placeholder: string; hasError: boolean;
  autoFocus?: boolean; autoComplete?: string; enterKeyHint?: "next" | "done" | "go" | "search" | "send"; icon?: React.ReactNode; countryFilter?: string;
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastQueryRef = useRef<string>("");
  const justPickedRef = useRef(false);
  useEffect(() => {
    const q = normalizePlaceText(value);
    if (justPickedRef.current) { justPickedRef.current = false; return; }
    if (q.length < 2) { setItems([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const tid = setTimeout(async () => {
      lastQueryRef.current = q;
      const results = await searchPlaces(q, { signal: ctrl.signal, limit: 6 });
      const filtered = countryFilter?.trim()
        ? [...results.filter((r) => r.country?.toLowerCase().includes(countryFilter.trim().toLowerCase())), ...results.filter((r) => !r.country?.toLowerCase().includes(countryFilter.trim().toLowerCase()))]
        : results;
      if (lastQueryRef.current === q) { setItems(filtered); setLoading(false); setActive(filtered.length > 0 ? 0 : -1); }
    }, 220);
    return () => { clearTimeout(tid); ctrl.abort(); };
  }, [value, countryFilter]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const select = (idx: number) => { const s = items[idx]; if (!s) return; justPickedRef.current = true; onPick(s); setOpen(false); setItems([]); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { if (open && active >= 0 && items[active]) { e.preventDefault(); select(active); } }
    else if (e.key === "Escape") setOpen(false);
  };
  const listboxId = `${id}-listbox`;
  const showList = open && (loading || items.length > 0 || normalizePlaceText(value).length >= 2);
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {icon && (<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">{icon}</span>)}
        <input id={id} autoFocus={autoFocus} value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={(e) => { setTimeout(() => onChange(normalizePlaceText(e.target.value)), 120); }} onKeyDown={onKeyDown} placeholder={placeholder} className={inputBase(hasError) + (icon ? " pl-10" : "") + " pr-10"} aria-invalid={hasError} aria-required="true" aria-describedby={hasError ? `${id}-err` : undefined} autoComplete={autoComplete ?? "off"} maxLength={80} enterKeyHint={enterKeyHint} spellCheck={false} role="combobox" aria-expanded={showList} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={active >= 0 && items[active] ? `${id}-opt-${active}` : undefined} />
        {loading && (<Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" aria-hidden="true" />)}
      </div>
      {showList && (
        <ul id={listboxId} role="listbox" aria-label={t("sendWizard.autocomplete.label")} className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-lg text-sm">
          {loading && items.length === 0 && (<li className="px-3 py-2 text-muted-foreground" aria-disabled="true">{t("sendWizard.autocomplete.loading")}</li>)}
          {!loading && items.length === 0 && (<li className="px-3 py-2 text-muted-foreground" aria-disabled="true">{t("sendWizard.autocomplete.empty")}</li>)}
          {items.map((s, i) => {
            const isActive = i === active;
            return (
              <li key={s.id} id={`${id}-opt-${i}`} role="option" aria-selected={isActive} onMouseDown={(e) => { e.preventDefault(); select(i); }} onMouseEnter={() => setActive(i)} className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${isActive ? "bg-primary/10 text-foreground" : "text-foreground"}`}>
                <MapPin size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="truncate"><span className="font-medium">{s.city}</span>{s.region && (<span className="text-muted-foreground"> · {s.region}</span>)}{s.country && (<span className="text-muted-foreground"> · {s.country}</span>)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const DateStep = ({ value, onChange, err }: { value: string; onChange: (v: string) => void; err: string | null; }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const max = new Date();
  max.setDate(max.getDate() + 365);
  const maxIso = max.toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <Field label={t("sendWizard.label.date")} required error={err} htmlFor="wiz-date" hintId="wiz-date-hint" hint={t("sendWizard.hint.dateNote")}>
        <div className="relative">
          <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id="wiz-date" autoFocus type="date" value={value} min={today} max={maxIso} onChange={(e) => onChange(e.target.value)} className={inputBase(!!err) + " pl-10"} aria-invalid={!!err} aria-required="true" aria-describedby={err ? "wiz-date-err" : "wiz-date-hint"} enterKeyHint="done" />
        </div>
      </Field>
    </div>
  );
};

export default SendWizard;
