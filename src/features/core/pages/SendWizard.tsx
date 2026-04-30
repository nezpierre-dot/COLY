/**
 * SendWizard — Assistant pas-à-pas du CTA « Envoyer ».
 *
 * Remplace SendChoice à la route /send.
 *
 * Étape 1 — Type d'envoi (Colis vs NeedIt). Si NeedIt → /needit/categories.
 *   Si Colis → poursuit le wizard (étapes 2 → 4) et préremplit /send-coly via
 *   le draft localStorage `nidit:draft:send-coly` que SendColy restaure
 *   automatiquement (useDraft).
 *
 * Étape 2 — Origine (pays + ville)
 * Étape 3 — Destination (pays + ville)
 * Étape 4 — Date de remise
 *
 * UX :
 *  - Validation Zod en live (erreurs sous chaque champ, pas de toast spam)
 *  - Stepper visuel + barre de progression
 *  - Navigation clavier complète (Tab, Enter pour Suivant si valide)
 *  - aria-live pour annoncer les erreurs aux lecteurs d'écran
 *  - Bouton « Passer cette étape » : on peut sauter directement vers /send-coly
 *    et tout finir là-bas (pour utilisateurs experts)
 *
 * Analytics : send_wizard_view, send_wizard_step, send_wizard_complete,
 *             send_wizard_skip, send_wizard_pick_type
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  ShoppingBag,
  MapPin,
  Calendar,
  CheckCircle2,
  SkipForward,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

type SendType = "parcel" | "needit";

const STORAGE_PREFIX = "nidit:draft:";
const SEND_COLY_KEY = STORAGE_PREFIX + "send-coly";

// Schéma Zod par étape — utilisé pour la validation live
const stepSchemas = {
  origin: z.object({
    departCountry: z.string().trim().min(2, "originCountryReq"),
    departCity: z.string().trim().min(2, "originCityReq"),
  }),
  destination: z.object({
    arrCountry: z.string().trim().min(2, "destCountryReq"),
    arrCity: z.string().trim().min(2, "destCityReq"),
  }),
  date: z.object({
    date: z
      .string()
      .min(1, "dateReq")
      .refine(
        (v) => new Date(v) >= new Date(new Date().toDateString()),
        "dateFuture"
      ),
  }),
};

type FieldErrors = Record<string, string>;

const SendWizard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState(1);
  const [type, setType] = useState<SendType | null>(null);

  // Données collectées (mappées sur les noms d'état de SendColy)
  const [departCountry, setDepartCountry] = useState("");
  const [departCity, setDepartCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [date, setDate] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLButtonElement | null>(null);

  useEffect(() => {
    trackEvent("send_wizard_view", "navigation");
  }, []);

  useEffect(() => {
    trackEvent("send_wizard_step", "navigation", { step });
    // Focus le titre à chaque étape (pour les lecteurs d'écran)
    headingRef.current?.focus();
  }, [step]);

  // ---- Validation live ---------------------------------------------------
  const validateStep = (target: 1 | 2 | 3 | 4 = step): FieldErrors => {
    if (target === 1) {
      return type ? {} : { type: "typeReq" };
    }
    const schemaMap = { 2: stepSchemas.origin, 3: stepSchemas.destination, 4: stepSchemas.date } as const;
    const dataMap = {
      2: { departCountry, departCity },
      3: { arrCountry, arrCity },
      4: { date },
    } as const;
    const result = schemaMap[target].safeParse(dataMap[target]);
    if (result.success) return {};
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      next[String(issue.path[0])] = issue.message;
    }
    return next;
  };

  // Re-valide à chaque changement de champ (mais n'affiche que si touched)
  const liveErrors = useMemo(() => validateStep(step), [
    step,
    type,
    departCountry,
    departCity,
    arrCountry,
    arrCity,
    date,
  ]);

  const showError = (field: string): string | null => {
    if (!touched[field]) return null;
    const msg = liveErrors[field] || errors[field];
    return msg ? t(`sendWizard.err.${msg}`) : null;
  };

  const stepIsValid = Object.keys(liveErrors).length === 0;

  // ---- Navigation --------------------------------------------------------
  const goNext = () => {
    // Marque tous les champs de l'étape comme touched pour révéler les erreurs
    const fields =
      step === 1
        ? ["type"]
        : step === 2
        ? ["departCountry", "departCity"]
        : step === 3
        ? ["arrCountry", "arrCity"]
        : ["date"];
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((f) => [f, true])) }));

    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    hapticLight();

    // Étape 1 : si NeedIt, on quitte directement vers le flow NeedIt
    if (step === 1 && type === "needit") {
      trackEvent("send_wizard_pick_type", "navigation", { type });
      navigate("/needit/categories");
      return;
    }

    if (step === 4) {
      finishToSendColy();
      return;
    }

    setDirection(1);
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const goBack = () => {
    if (step === 1) {
      navigate(-1);
      return;
    }
    setDirection(-1);
    setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  const skipToSendColy = () => {
    trackEvent("send_wizard_skip", "navigation", { from_step: step });
    finishToSendColy();
  };

  // Écrit dans le draft localStorage pour que SendColy restaure les valeurs
  const finishToSendColy = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(SEND_COLY_KEY) || "null");
      const merged = {
        data: {
          ...(existing?.data || {}),
          ...(departCountry && { departCountry }),
          ...(departCity && { departCity }),
          ...(arrCountry && { arrCountry }),
          ...(arrCity && { arrCity }),
          ...(date && { date }),
        },
        updatedAt: Date.now(),
      };
      localStorage.setItem(SEND_COLY_KEY, JSON.stringify(merged));
    } catch {
      // Quota / private mode : on continue, l'utilisateur retapera s'il faut
    }
    trackEvent("send_wizard_complete", "navigation", {
      hasCountry: !!departCountry,
      hasCity: !!departCity,
      hasArr: !!arrCity,
      hasDate: !!date,
    });
    navigate("/send-coly");
  };

  // ---- Rendu --------------------------------------------------------------
  const STEP_LABELS = [
    t("sendWizard.step.type"),
    t("sendWizard.step.origin"),
    t("sendWizard.step.destination"),
    t("sendWizard.step.date"),
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        <header className="px-5 pt-5 pb-3 flex items-center gap-2">
          <button
            onClick={goBack}
            aria-label={t("common.back")}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {t("sendChoice.headerTitle")}
          </h1>
          {step > 1 && (
            <button
              onClick={skipToSendColy}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary rounded-md px-2 py-1"
            >
              <SkipForward size={14} /> {t("sendWizard.skip")}
            </button>
          )}
        </header>

        {/* Stepper */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-1.5 rounded-full transition-all ${
                      done
                        ? "bg-primary"
                        : active
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] sm:text-xs transition-colors ${
                      active ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {t("sendWizard.stepAria", {
              current: String(step),
              total: "4",
              label: STEP_LABELS[step - 1],
            })}
          </p>
        </div>

        <main className="px-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-foreground leading-tight outline-none"
          >
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

          {/* Erreurs globales (a11y) */}
          <div aria-live="assertive" className="sr-only">
            {Object.values(errors).map((e) => t(`sendWizard.err.${e}`)).join(". ")}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
              transition={{ duration: 0.22 }}
              className="mt-6"
            >
              {step === 1 && (
                <TypeStep
                  value={type}
                  onChange={(v) => {
                    setType(v);
                    setTouched((p) => ({ ...p, type: true }));
                  }}
                />
              )}
              {step === 2 && (
                <CityCountryStep
                  icon={<MapPin size={18} />}
                  countryLabel={t("sendWizard.label.country")}
                  cityLabel={t("sendWizard.label.city")}
                  countryPh={t("sendWizard.ph.originCountry")}
                  cityPh={t("sendWizard.ph.originCity")}
                  country={departCountry}
                  city={departCity}
                  setCountry={(v) => {
                    setDepartCountry(v);
                    setTouched((p) => ({ ...p, departCountry: true }));
                  }}
                  setCity={(v) => {
                    setDepartCity(v);
                    setTouched((p) => ({ ...p, departCity: true }));
                  }}
                  countryErr={showError("departCountry")}
                  cityErr={showError("departCity")}
                />
              )}
              {step === 3 && (
                <CityCountryStep
                  icon={<MapPin size={18} />}
                  countryLabel={t("sendWizard.label.country")}
                  cityLabel={t("sendWizard.label.city")}
                  countryPh={t("sendWizard.ph.destCountry")}
                  cityPh={t("sendWizard.ph.destCity")}
                  country={arrCountry}
                  city={arrCity}
                  setCountry={(v) => {
                    setArrCountry(v);
                    setTouched((p) => ({ ...p, arrCountry: true }));
                  }}
                  setCity={(v) => {
                    setArrCity(v);
                    setTouched((p) => ({ ...p, arrCity: true }));
                  }}
                  countryErr={showError("arrCountry")}
                  cityErr={showError("arrCity")}
                />
              )}
              {step === 4 && (
                <DateStep
                  value={date}
                  onChange={(v) => {
                    setDate(v);
                    setTouched((p) => ({ ...p, date: true }));
                  }}
                  err={showError("date")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="fixed bottom-20 left-0 right-0 px-5">
          <button
            onClick={goNext}
            disabled={!stepIsValid && Object.keys(touched).length > 0}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none"
          >
            {step === 4 ? (
              <>
                <CheckCircle2 size={18} /> {t("sendWizard.finish")}
              </>
            ) : (
              <>
                {t("common.next")} <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

// =============== Sous-composants ===========================================

const TypeStep = ({
  value,
  onChange,
}: {
  value: SendType | null;
  onChange: (v: SendType) => void;
}) => {
  const { t } = useTranslation();
  const choices: Array<{
    key: SendType;
    title: string;
    subtitle: string;
    example: string;
    Icon: typeof Package;
  }> = [
    {
      key: "parcel",
      title: t("sendChoice.parcelTitle"),
      subtitle: t("sendChoice.parcelSubtitle"),
      example: t("sendChoice.parcelExample"),
      Icon: Package,
    },
    {
      key: "needit",
      title: t("sendChoice.needitTitle"),
      subtitle: t("sendChoice.needitSubtitle"),
      example: t("sendChoice.needitExample"),
      Icon: ShoppingBag,
    },
  ];

  return (
    <div role="radiogroup" aria-label={t("sendChoice.groupAria")} className="space-y-3">
      {choices.map((c, idx) => {
        const selected = value === c.key;
        const Icon = c.Icon;
        return (
          <motion.button
            key={c.key}
            role="radio"
            aria-checked={selected}
            whileTap={{ scale: 0.98 }}
            autoFocus={idx === 0 && value === null}
            onClick={() => onChange(c.key)}
            className={[
              "w-full text-left rounded-2xl p-4 border transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/40",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">{c.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{c.subtitle}</p>
                <span className="inline-block mt-2 text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {c.example}
                </span>
              </div>
              {selected && (
                <CheckCircle2 size={20} className="text-primary shrink-0 mt-1" />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

const Field = ({
  label,
  required,
  error,
  children,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  htmlFor: string;
}) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground mb-1.5">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
    {error && (
      <p
        className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200"
        role="alert"
      >
        {error}
      </p>
    )}
  </div>
);

const inputBase = (hasErr: boolean) =>
  `w-full border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground bg-background focus:outline-none transition-all ${
    hasErr
      ? "border-destructive ring-1 ring-destructive/30"
      : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
  }`;

const CityCountryStep = ({
  icon,
  countryLabel,
  cityLabel,
  countryPh,
  cityPh,
  country,
  city,
  setCountry,
  setCity,
  countryErr,
  cityErr,
}: {
  icon: React.ReactNode;
  countryLabel: string;
  cityLabel: string;
  countryPh: string;
  cityPh: string;
  country: string;
  city: string;
  setCountry: (v: string) => void;
  setCity: (v: string) => void;
  countryErr: string | null;
  cityErr: string | null;
}) => (
  <div className="space-y-4">
    <Field label={countryLabel} required error={countryErr} htmlFor="wiz-country">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          id="wiz-country"
          autoFocus
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={countryPh}
          className={inputBase(!!countryErr) + " pl-10"}
          aria-invalid={!!countryErr}
        />
      </div>
    </Field>
    <Field label={cityLabel} required error={cityErr} htmlFor="wiz-city">
      <input
        id="wiz-city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder={cityPh}
        className={inputBase(!!cityErr)}
        aria-invalid={!!cityErr}
      />
    </Field>
  </div>
);

const DateStep = ({
  value,
  onChange,
  err,
}: {
  value: string;
  onChange: (v: string) => void;
  err: string | null;
}) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <Field label={t("sendWizard.label.date")} required error={err} htmlFor="wiz-date">
        <div className="relative">
          <Calendar
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="wiz-date"
            autoFocus
            type="date"
            value={value}
            min={today}
            onChange={(e) => onChange(e.target.value)}
            className={inputBase(!!err) + " pl-10"}
            aria-invalid={!!err}
          />
        </div>
      </Field>
      <p className="text-xs text-muted-foreground">{t("sendWizard.hint.dateNote")}</p>
    </div>
  );
};

export default SendWizard;
