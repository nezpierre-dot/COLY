import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, X, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";

interface Step {
  id: string;
  label: string;
  done: boolean;
  cta: string;
  action: () => void;
}

const DISMISS_KEY = "getting-started-dismissed";

/**
 * Checklist de démarrage affichée en haut du Dashboard pour les nouveaux users.
 * - Disparaît automatiquement quand toutes les étapes sont complétées
 * - Peut être fermée manuellement (mémorisé en localStorage)
 * - Ne s'affiche pas pour les users avec déjà au moins 1 envoi ou voyage
 */
const GettingStartedChecklist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasKyc, setHasKyc] = useState(false);
  const [hasFirstAction, setHasFirstAction] = useState(false);
  const [hasMatch, setHasMatch] = useState(false);

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

      const profile = profileRes.data;
      setHasProfile(!!(profile?.full_name && profile?.avatar_url));
      setHasKyc(profile?.kyc_status === "verified");
      const totalActions = (shipsRes.count || 0) + (voyagesRes.count || 0) + (missionsRes.count || 0);
      setHasFirstAction(totalActions > 0);
      const totalMatches = (matchedShipsRes.count || 0) + (matchedMissionsRes.count || 0);
      setHasMatch(totalMatches > 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const steps: Step[] = [
    {
      id: "profile",
      label: t("checklist.completeProfile") || "Complète ton profil (nom, photo)",
      done: hasProfile,
      cta: t("checklist.go") || "Y aller",
      action: () => navigate("/my-info"),
    },
    {
      id: "first-action",
      label: t("checklist.firstAction") || "Crée ton 1er envoi ou voyage",
      done: hasFirstAction,
      cta: t("checklist.start") || "Commencer",
      action: () => navigate("/send-coly"),
    },
    {
      id: "match",
      label: t("checklist.firstMatch") || "Obtiens ta 1ʳᵉ mise en relation",
      done: hasMatch,
      cta: t("checklist.explore") || "Explorer",
      action: () => navigate("/voyageur-search"),
    },
    {
      id: "kyc",
      label: t("checklist.verifyId") || "Vérifie ton identité (KYC)",
      done: hasKyc,
      cta: t("checklist.verify") || "Vérifier",
      action: () => navigate("/kyc"),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  // Hide entirely if dismissed, loading, all done, or already an experienced user
  if (dismissed || loading || allDone) return null;

  // If the user already has actions AND a match, treat as experienced and hide
  if (hasFirstAction && hasMatch && hasProfile) return null;

  const handleDismiss = () => {
    hapticLight();
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/20 rounded-2xl p-4 mb-3 relative overflow-hidden"
      >
        <button
          onClick={handleDismiss}
          aria-label={t("common.dismiss") || "Fermer"}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t("checklist.title") || "Bien démarrer sur Nidit"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {completedCount}/{total} · {progress}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <ul className="space-y-1.5">
          {steps.map((step) => (
            <li key={step.id}>
              <button
                onClick={() => { if (!step.done) { hapticLight(); step.action(); } }}
                disabled={step.done}
                className={`w-full flex items-center gap-2.5 py-1.5 px-1 rounded-lg text-left transition-colors ${
                  step.done ? "opacity-60" : "hover:bg-card/50 active:bg-card/80"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 size={16} className="text-success shrink-0" />
                ) : (
                  <Circle size={16} className="text-muted-foreground shrink-0" />
                )}
                <span className={`flex-1 text-xs ${step.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                  {step.label}
                </span>
                {!step.done && (
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5 shrink-0">
                    {step.cta} <ArrowRight size={10} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};

export default GettingStartedChecklist;
