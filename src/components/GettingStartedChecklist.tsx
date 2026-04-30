import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, X, Sparkles, ArrowRight, Plane, Send, ShieldCheck, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "getting-started-dismissed";
const SHOWN_KEY = "getting-started-shown";

type StepId = "profile" | "first-action" | "match" | "kyc";

interface Step {
  id: StepId;
  label: string;
  hint?: string;
  done: boolean;
  cta: string;
  icon: React.ElementType;
  action: () => void;
}

type UserProfile = {
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: string | null;
};

/**
 * Checklist de démarrage adaptative.
 *
 * Profils détectés (status):
 *  - "fresh"        : 0 action, profil vide → 4 étapes complètes
 *  - "profile-only" : profil rempli, 0 action → focus sur 1ʳᵉ action
 *  - "active"       : 1+ action, pas encore de match → focus sur match + KYC
 *  - "kyc-partial"  : KYC pending/none alors que des actions existent → focus KYC
 *  - "experienced"  : expérimenté → checklist masquée
 *
 * Accessibilité :
 *  - role="region" + aria-label sur le conteneur
 *  - <ol> sémantique avec aria-current sur la 1ʳᵉ étape non complétée
 *  - Flèches haut/bas pour naviguer entre les étapes (roving tabindex)
 *  - Focus restauré sur le bouton "fermer" après dismiss
 *
 * Analytics :
 *  - `checklist_shown` (1×/session)
 *  - `checklist_step_click` (par étape)
 *  - `checklist_dismissed` / `checklist_completed`
 */
const GettingStartedChecklist = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");

  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasFirstAction, setHasFirstAction] = useState(false);
  const [hasMatch, setHasMatch] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dismissBtnRef = useRef<HTMLButtonElement | null>(null);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Fetch user state
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, shipsRes, voyagesRes, missionsRes, matchedShipsRes, matchedMissionsRes] = await Promise.all([
        supabase.from("profiles").select("full_name,kyc_status,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("voyages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("voyageur_id", "is", null),
        supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("voyageur_id", "is", null),
      ]);
      if (cancelled) return;

      setProfile((profileRes.data as UserProfile) ?? null);
      const totalActions = (shipsRes.count || 0) + (voyagesRes.count || 0) + (missionsRes.count || 0);
      setHasFirstAction(totalActions > 0);
      const totalMatches = (matchedShipsRes.count || 0) + (matchedMissionsRes.count || 0);
      setHasMatch(totalMatches > 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const hasProfile = !!(profile?.full_name && profile?.avatar_url);
  const hasKyc = profile?.kyc_status === "verified";

  /** Adaptive status — drives which steps are shown and the headline copy. */
  const status: "fresh" | "profile-only" | "active" | "kyc-partial" | "experienced" = useMemo(() => {
    if (hasFirstAction && hasMatch && hasProfile && hasKyc) return "experienced";
    if (hasFirstAction && !hasKyc) return "kyc-partial";
    if (hasFirstAction) return "active";
    if (hasProfile) return "profile-only";
    return "fresh";
  }, [hasFirstAction, hasMatch, hasProfile, hasKyc]);

  /** All possible steps with their pre-filled `done` state. */
  const allSteps: Step[] = useMemo(() => [
    {
      id: "profile",
      label: t("checklist.completeProfile") || "Complète ton profil (nom, photo)",
      hint: hasProfile ? undefined : t("checklist.profileHint") || "1 minute, ça booste ta confiance",
      done: hasProfile,
      cta: t("checklist.go") || "Y aller",
      icon: UserIcon,
      action: () => navigate("/my-info"),
    },
    {
      id: "first-action",
      label: isVoyageur
        ? (t("checklist.firstActionVoyageur") || "Propose ton 1er voyage")
        : (t("checklist.firstAction") || "Crée ton 1er envoi ou voyage"),
      done: hasFirstAction,
      cta: t("checklist.start") || "Commencer",
      icon: isVoyageur ? Plane : Send,
      action: () => navigate(isVoyageur ? "/new-trip" : "/send-coly"),
    },
    {
      id: "match",
      label: t("checklist.firstMatch") || "Obtiens ta 1ʳᵉ mise en relation",
      done: hasMatch,
      cta: t("checklist.explore") || "Explorer",
      icon: Sparkles,
      action: () => navigate(isVoyageur ? "/browse-missions" : "/voyageur-search"),
    },
    {
      id: "kyc",
      label: t("checklist.verifyId") || "Vérifie ton identité",
      hint: hasKyc ? undefined : t("checklist.kycHint") || "Obligatoire pour le 1er paiement",
      done: hasKyc,
      cta: t("checklist.verify") || "Vérifier",
      icon: ShieldCheck,
      action: () => navigate("/kyc"),
    },
  ], [t, hasProfile, hasFirstAction, hasMatch, hasKyc, isVoyageur, navigate]);

  /** Filter steps based on adaptive status: hide irrelevant ones. */
  const steps: Step[] = useMemo(() => {
    switch (status) {
      case "experienced":
        return [];
      case "kyc-partial":
        // User is active but missing KYC — surface only what matters
        return allSteps.filter((s) => !s.done || s.id === "kyc");
      case "active":
        // Hide profile if done, focus on match + kyc
        return allSteps.filter((s) => !s.done || s.id === "first-action");
      case "profile-only":
        return allSteps.filter((s) => s.id !== "match" || hasFirstAction);
      case "fresh":
      default:
        return allSteps;
    }
  }, [allSteps, status, hasFirstAction]);

  const completedCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = total === 0 ? 100 : Math.round((completedCount / total) * 100);
  const allDone = total > 0 && completedCount === total;
  const firstUndoneIndex = steps.findIndex((s) => !s.done);

  // Adaptive headline
  const headline = useMemo(() => {
    switch (status) {
      case "kyc-partial": return t("checklist.headline.kycPartial") || "Plus qu'une étape pour débloquer les paiements";
      case "active": return t("checklist.headline.active") || "Tu es lancé ! Continue sur ta lancée";
      case "profile-only": return t("checklist.headline.profileOnly") || "Bienvenue ! Crée ta 1ʳᵉ activité";
      case "fresh":
      default: return t("checklist.title") || "Bien démarrer sur Nidit";
    }
  }, [status, t]);

  // Track "shown" once per session per status
  useEffect(() => {
    if (loading || dismissed || allDone || total === 0 || !user) return;
    const sessionKey = `${SHOWN_KEY}:${user.id}:${status}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    trackEvent("checklist_shown", "onboarding", { status, total, completed: completedCount });
  }, [loading, dismissed, allDone, status, total, completedCount, user]);

  // Track completion (first time we observe allDone for this user)
  useEffect(() => {
    if (loading || !user) return;
    if (allDone) {
      const completedKey = `${SHOWN_KEY}:${user.id}:completed`;
      if (!localStorage.getItem(completedKey)) {
        localStorage.setItem(completedKey, "1");
        trackEvent("checklist_completed", "onboarding", { status });
      }
    }
  }, [loading, allDone, status, user]);

  // Hide entirely
  if (loading || !user) return null;
  if (dismissed) return null;
  if (status === "experienced") return null;
  if (allDone) return null;

  const handleDismiss = () => {
    hapticLight();
    trackEvent("checklist_dismissed", "onboarding", {
      status,
      completed: completedCount,
      total,
    });
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleStepClick = (step: Step, index: number) => {
    if (step.done) return;
    hapticLight();
    trackEvent("checklist_step_click", "onboarding", { step: step.id, index, status });
    step.action();
  };

  // Roving tabindex for keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.min(index + 1, steps.length - 1);
      setFocusedIndex(next);
      stepRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = Math.max(index - 1, 0);
      setFocusedIndex(prev);
      stepRefs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
      stepRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = steps.length - 1;
      setFocusedIndex(last);
      stepRefs.current[last]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      dismissBtnRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        role="region"
        aria-labelledby="checklist-heading"
        aria-describedby="checklist-progress"
        data-testid="getting-started-checklist"
        data-status={status}
        className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/20 rounded-2xl p-4 mb-3 relative overflow-hidden"
      >
        <button
          ref={dismissBtnRef}
          onClick={handleDismiss}
          aria-label={t("checklist.dismissAria") || "Fermer la checklist de démarrage"}
          data-testid="checklist-dismiss"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        >
          <X size={14} className="text-muted-foreground" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 mb-2 pr-8">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center" aria-hidden="true">
            <Sparkles size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="checklist-heading" className="text-sm font-semibold text-foreground">
              {headline}
            </h2>
            <p id="checklist-progress" className="text-[11px] text-muted-foreground">
              <span className="sr-only">{t("checklist.progressLabel") || "Progression :"} </span>
              {completedCount}/{total} · {progress}%
            </p>
          </div>
        </div>

        {/* Progress bar (decorative, value annoncée via aria-describedby) */}
        <div
          className="h-1.5 bg-muted rounded-full overflow-hidden mb-3"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("checklist.progressLabel") || "Progression de la checklist"}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <ol className="space-y-1.5" aria-label={t("checklist.stepsLabel") || "Étapes de démarrage"}>
          {steps.map((step, index) => {
            const isCurrent = index === firstUndoneIndex;
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <button
                  ref={(el) => { stepRefs.current[index] = el; }}
                  onClick={() => handleStepClick(step, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  disabled={step.done}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={
                    step.done
                      ? `${step.label} — ${t("checklist.statusDone") || "complété"}`
                      : `${step.label}. ${step.hint || ""} ${t("checklist.statusTodo") || "À faire"}`
                  }
                  data-testid={`checklist-step-${step.id}`}
                  data-step-done={step.done ? "true" : "false"}
                  tabIndex={focusedIndex === index ? 0 : -1}
                  className={`w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    step.done ? "opacity-60 cursor-default" : "hover:bg-card/50 active:bg-card/80"
                  } ${isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                >
                  {step.done ? (
                    <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                  <Icon size={12} className={step.done ? "text-muted-foreground" : "text-primary"} aria-hidden="true" />
                  <span className={`flex-1 text-xs ${step.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                    {step.label}
                    {!step.done && step.hint && (
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">{step.hint}</span>
                    )}
                  </span>
                  {!step.done && (
                    <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5 shrink-0" aria-hidden="true">
                      {step.cta} <ArrowRight size={10} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </motion.section>
    </AnimatePresence>
  );
};

export default GettingStartedChecklist;
