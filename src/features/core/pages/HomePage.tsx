/**
 * HomePage — Home unifiée B2C "Que veux-tu faire aujourd'hui ?"
 *
 * Remplace l'ancien Dashboard riche (toujours accessible via /dashboard-classic).
 * Architecture :
 *  - 2 gros CTA (Envoyer / Transporter) — décision instantanée
 *  - "Envoyer" mène à un écran de choix (colis classique vs NeedIt)
 *  - "Transporter" bascule automatiquement le rôle si nécessaire (1 tap)
 *  - Section contextuelle intelligente :
 *      • Skeleton pendant le chargement
 *      • Action en cours (1er voyage/colis actif) avec gestion "expirée"
 *      • Sinon : GettingStartedChecklist (déjà adaptative)
 *  - 3 raccourcis discrets (Activité, Wallet, Progression) avec prefetch hover/focus
 *
 * Accessibilité :
 *  - Skip link vers le contenu principal
 *  - Section CTA en role="group" + aria-label
 *  - aria-busy sur la section contextuelle pendant le chargement
 *  - aria-live polite pour annoncer l'état du toggle de rôle
 *  - aria-disabled (et non disabled visuel) pour conserver le focus
 *  - Focus visible sur tous les éléments interactifs
 *
 * Décisions UX :
 *  - Dark mode, design tokens uniquement
 *  - Tutoiement, "Voyageur Nidit" (jamais "Transporteur")
 *  - Analytics : home_view, home_cta_click, home_shortcut_click, home_shortcut_prefetch
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Send,
  Plane,
  ArrowRight,
  Clock,
  Wallet,
  Sparkles,
  ListChecks,
  Package,
  ShoppingBag,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import PageTransition from "@/components/PageTransition";
import { prefetchAllHubsOnIdle, prefetchHub } from "@/features/core/hubs/prefetch";
import { toast } from "sonner";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import appLogo from "@/assets/logo.png";

type ActiveStatus = "live" | "expired";

type ActiveItem = {
  kind: "voyage" | "shipment" | "mission";
  id: string;
  /** Label principal lisible (ex. "Paris → Dakar") */
  label: string;
  /** Sous-titre court (statut humain, ex. "En transit") */
  subtitle: string;
  /** Date pertinente (départ pour voyage, création sinon) */
  date: string | null;
  /** "expired" si la date est passée et l'item est encore actif */
  status: ActiveStatus;
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: "home.statusActive",
  pending: "home.statusPending",
  matched: "home.statusMatched",
  accepted: "home.statusAccepted",
  picked_up: "home.statusPickedUp",
  in_transit: "home.statusInTransit",
};

/** Skeleton pour la section contextuelle (action en cours) */
const ContextualSkeleton = () => (
  <div
    className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4"
    aria-hidden="true"
  >
    <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
      <div className="h-3.5 w-2/3 bg-muted rounded animate-pulse" />
      <div className="h-2.5 w-24 bg-muted rounded animate-pulse" />
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { user, roles, refresh } = useAuth();
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");
  const prefersReducedMotion = useReducedMotion();

  const [firstName, setFirstName] = useState<string>("");
  const [active, setActive] = useState<ActiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const transportBtnRef = useRef<HTMLButtonElement | null>(null);

  // ── Prefetch hub chunks idle pour fluidifier la navigation suivante
  useEffect(() => {
    prefetchAllHubsOnIdle();
  }, []);

  // ── Greeting + 1ʳᵉ action en cours (la plus prioritaire)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [profileRes, voyageRes, shipRes, missionRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("voyages")
          .select("id,departure_city,arrival_city,departure_date,status")
          .eq("user_id", user.id)
          .in("status", ["active", "matched", "in_transit"])
          .order("departure_date", { ascending: true })
          .limit(1),
        supabase
          .from("shipments")
          .select("id,arrival_city,arrival_country,created_at,status")
          .eq("user_id", user.id)
          .in("status", ["pending", "accepted", "picked_up", "in_transit"])
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("needit_missions")
          .select("id,city,country,created_at,status")
          .eq("user_id", user.id)
          .in("status", ["pending", "accepted", "picked_up", "in_transit"])
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;

      if (profileRes.data?.full_name) {
        setFirstName(profileRes.data.full_name.trim().split(/\s+/)[0] ?? "");
      }

      const computeStatus = (date: string | null): ActiveStatus => {
        if (!date) return "live";
        const ts = new Date(date).getTime();
        if (Number.isNaN(ts)) return "live";
        // "expiré" : date passée de + de 24h, on considère l'item comme à réviser
        return ts < Date.now() - 24 * 3600 * 1000 ? "expired" : "live";
      };

      // Helper pour fallback gracieux quand une ville manque
      const safe = (s: string | null | undefined, fb: string) =>
        s && s.trim().length > 0 ? s : fb;

      const v = voyageRes.data?.[0];
      const s = shipRes.data?.[0];
      const m = missionRes.data?.[0];

      let chosen: ActiveItem | null = null;
      if (v) {
        const dep = safe(v.departure_city, t("home.unknownCity"));
        const arr = safe(v.arrival_city, t("home.unknownCity"));
        chosen = {
          kind: "voyage",
          id: v.id,
          label: `${dep} → ${arr}`,
          subtitle: t(STATUS_LABEL_KEYS[v.status] ?? "home.statusActive"),
          date: v.departure_date,
          status: computeStatus(v.departure_date),
        };
      } else if (s) {
        chosen = {
          kind: "shipment",
          id: s.id,
          label: `${t("home.shipmentTo")} ${safe(s.arrival_city, t("home.unknownDestination"))}`,
          subtitle: t(STATUS_LABEL_KEYS[s.status] ?? "home.statusPending"),
          date: s.created_at,
          status: "live", // shipments : pas d'expiration calendaire forte
        };
      } else if (m) {
        chosen = {
          kind: "mission",
          id: m.id,
          label: `${t("home.missionIn")} ${safe(m.city, t("home.unknownDestination"))}`,
          subtitle: t(STATUS_LABEL_KEYS[m.status] ?? "home.statusPending"),
          date: m.created_at,
          status: "live",
        };
      }
      setActive(chosen);
      setLoading(false);

      trackEvent("home_view", "navigation", {
        has_active: !!chosen,
        active_status: chosen?.status ?? "none",
        role: isVoyageur ? "voyageur" : "demandeur",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isVoyageur, t]);

  // ── CTA principal : Envoyer (écran de choix guidé)
  const handleSend = () => {
    hapticLight();
    trackEvent("home_cta_click", "navigation", { action: "send" });
    navigate("/send");
  };

  // ── CTA secondaire : Transporter (bascule auto le rôle si besoin)
  const handleTransport = async () => {
    if (switching) return;
    hapticLight();
    trackEvent("home_cta_click", "navigation", {
      action: "transport",
      needs_switch: !isVoyageur,
    });

    if (isVoyageur) {
      navigate("/new-trip");
      return;
    }

    if (!user) return;
    setSwitching(true);
    try {
      const { error } = await supabase.rpc("toggle_user_role", { _user_id: user.id });
      if (error) throw error;
      toast.success(t("home.switchedToVoyageur"));
      if (typeof refresh === "function") await refresh();
      navigate("/new-trip");
    } catch (e: any) {
      toast.error(e?.message || t("home.switchError"));
      // Restaurer le focus pour l'utilisateur clavier
      transportBtnRef.current?.focus();
    } finally {
      setSwitching(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return t("home.greetNight");
    if (hour < 12) return t("home.greetMorning");
    if (hour < 18) return t("home.greetAfternoon");
    return t("home.greetEvening");
  }, [t]);

  const formattedDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  // ── Raccourcis avec prefetch au hover/focus
  const shortcuts = useMemo(
    () => [
      {
        key: "activity" as const,
        hub: "activity" as const,
        icon: ListChecks,
        label: t("home.shortcutActivity"),
        to: "/activity",
      },
      {
        key: "wallet" as const,
        hub: "wallet" as const,
        icon: Wallet,
        label: t("home.shortcutWallet"),
        to: "/wallet",
      },
      {
        key: "progression" as const,
        hub: "progression" as const,
        icon: Sparkles,
        label: t("home.shortcutProgression"),
        to: "/progression",
      },
    ],
    [t],
  );

  const prefetchedRef = useRef<Set<string>>(new Set());
  const handlePrefetch = (hub: "wallet" | "activity" | "progression") => {
    if (prefetchedRef.current.has(hub)) return;
    prefetchedRef.current.add(hub);
    prefetchHub(hub);
    trackEvent("home_shortcut_prefetch", "engagement", { shortcut: hub });
  };

  return (
    <PageTransition>
      {/* Skip-link a11y */}
      <a
        href="#home-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:text-foreground focus:px-3 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-primary"
      >
        {t("home.skipToMain")}
      </a>

      <div className="page-shell pb-24">
        {/* ─── Header Future (aligné Missions/Messages/Profil) ─── */}
        <header className="page-header-soft">
          <div className="page-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src={appLogo} alt="" aria-hidden="true" className="w-10 h-10 rounded-xl object-contain" />
                <NotificationBell />
              </div>
              <button
                onClick={() => navigate("/my-account")}
                aria-label={t("home.openAccount")}
                className="icon-btn-soft"
              >
                <span className="text-sm font-semibold text-foreground" aria-hidden="true">
                  {firstName ? firstName[0]?.toUpperCase() : "·"}
                </span>
              </button>
            </div>

            <span className="greeting-bubble-xl mb-3">
              <Sparkles size={18} className="text-primary" />
              {greeting}{firstName ? `, ${firstName}` : ""}
            </span>
            <h1 className="text-[clamp(1.85rem,5.5vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              {t("home.question")}<br />
              <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                en un tap ✨
              </span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground font-medium max-w-[280px]">
              {t("home.subtitle")}
            </p>
          </div>
        </header>

        <main id="home-main" className="page-content pt-4 space-y-6">
          {/* Live region pour annoncer le toggle de rôle */}
          <div className="sr-only" role="status" aria-live="polite">
            {switching ? t("home.switching") : ""}
          </div>

          {/* 2 gros CTA */}
          <section
            aria-labelledby="home-cta-label"
          >
            <h2 id="home-cta-label" className="sr-only">
              {t("home.ctaGroupAria")}
            </h2>
            <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 auto-rows-fr list-none p-0 m-0">
              {/* CTA 1 — Envoyer un colis (bleu primary) */}
              <li className="contents">
                <motion.button
                  type="button"
                  onClick={handleSend}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 p-4 sm:p-5 text-left shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-md transition-all duration-200 h-full flex"
                  aria-labelledby="cta-send-title"
                  aria-describedby="cta-send-desc"
                >
                  <div aria-hidden="true" className="absolute -right-6 -top-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/15" />
                  <div aria-hidden="true" className="absolute -right-2 bottom-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10" />
                  <div className="relative flex items-start justify-between gap-2 w-full">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div aria-hidden="true" className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 sm:mb-3">
                        <Send className="text-white w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <h3 id="cta-send-title" className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight">
                        {t("home.ctaSendTitle")}
                      </h3>
                      <p id="cta-send-desc" className="text-xs sm:text-sm text-white/85 mt-1 leading-snug">
                        {t("home.ctaSendSubtitle")}
                      </p>
                    </div>
                    <ArrowRight aria-hidden="true" className="text-white/85 group-hover:translate-x-1 transition-transform shrink-0 mt-1 w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                  </div>
                </motion.button>
              </li>

              {/* CTA 2 — Demander un produit / NeedIt (violet secondary) */}
              <li className="contents">
                <motion.button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    trackEvent("home_cta_click", "navigation", { action: "needit" });
                    navigate("/needit/categories");
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary to-secondary/70 p-4 sm:p-5 text-left shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-md transition-all duration-200 h-full flex"
                  aria-labelledby="cta-needit-title"
                  aria-describedby="cta-needit-desc cta-needit-badge"
                >
                  <div aria-hidden="true" className="absolute -right-6 -top-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/15" />
                  <div aria-hidden="true" className="absolute -right-2 bottom-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10" />
                  <div className="relative flex items-start justify-between gap-2 w-full">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div aria-hidden="true" className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 sm:mb-3">
                        <ShoppingBag className="text-white w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <h3 id="cta-needit-title" className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight">
                        Demander un produit
                      </h3>
                      <p id="cta-needit-desc" className="text-xs sm:text-sm text-white/85 mt-1 leading-snug">
                        Fais ramener ton produit préféré de l'étranger
                      </p>
                      <span id="cta-needit-badge" className="inline-flex items-center gap-1 mt-auto pt-2 text-xs font-semibold text-white">
                        <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <Sparkles size={10} aria-hidden="true" /> NeedIt
                        </span>
                      </span>
                    </div>
                    <ArrowRight aria-hidden="true" className="text-white/85 group-hover:translate-x-1 transition-transform shrink-0 mt-1 w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                  </div>
                </motion.button>
              </li>

              {/* CTA 3 — Transporter (orange accent) */}
              <li className="contents">
                <motion.button
                  type="button"
                  ref={transportBtnRef}
                  onClick={(e) => {
                    if (switching) {
                      e.preventDefault();
                      return;
                    }
                    handleTransport();
                  }}
                  onKeyDown={(e) => {
                    if (switching && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                    }
                  }}
                  disabled={switching}
                  aria-disabled={switching}
                  aria-busy={switching}
                  whileTap={{ scale: switching ? 1 : 0.98 }}
                  className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-accent to-accent/70 p-4 sm:p-5 text-left shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-progress disabled:hover:translate-y-0 disabled:hover:shadow-lg disabled:active:scale-100 h-full flex"
                  aria-labelledby="cta-transport-title"
                  aria-describedby={switching ? "cta-transport-status" : "cta-transport-desc"}
                >
                  <div aria-hidden="true" className="absolute -right-6 -top-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/15" />
                  <div aria-hidden="true" className="absolute -right-2 bottom-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10" />
                  <div className="relative flex items-start justify-between gap-2 w-full">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div aria-hidden="true" className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 sm:mb-3">
                        {switching ? (
                          <Loader2 className="text-white w-5 h-5 sm:w-[22px] sm:h-[22px] animate-spin" />
                        ) : (
                          <Plane className="text-white w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                        )}
                      </div>
                      <h3 id="cta-transport-title" className="text-base sm:text-lg lg:text-xl font-bold text-white leading-tight">
                        {t("home.ctaTransportTitle")}
                        {!isVoyageur && !switching && (
                          <span className="sr-only"> — {t("home.ctaTransportSwitchAria")}</span>
                        )}
                      </h3>
                      <p id="cta-transport-desc" className="text-xs sm:text-sm text-white/85 mt-1 leading-snug">
                        {switching ? t("home.switching") : t("home.ctaTransportSubtitle")}
                      </p>
                      {/* Statut live annoncé pendant le switching */}
                      <span
                        id="cta-transport-status"
                        role="status"
                        aria-live="polite"
                        className="sr-only"
                      >
                        {switching ? t("home.switching") : ""}
                      </span>
                      {!isVoyageur && !switching && (
                        <span className="inline-flex items-center gap-1 mt-auto pt-2 text-xs font-semibold text-white">
                          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                            <Sparkles size={10} aria-hidden="true" /> {t("home.autoSwitchHint")}
                          </span>
                        </span>
                      )}
                    </div>
                    <ArrowRight aria-hidden="true" className="text-white/85 group-hover:translate-x-1 transition-transform shrink-0 mt-1 w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                  </div>
                </motion.button>
              </li>
            </ul>
          </section>

          {/* Section contextuelle */}
          <section
            aria-busy={loading}
            aria-label={t("home.contextualAria")}
          >
            {loading ? (
              <ContextualSkeleton />
            ) : active ? (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (active.kind === "voyage") navigate(`/voyage/${active.id}`);
                  else if (active.kind === "shipment") navigate(`/shipment/${active.id}`);
                  else navigate(`/mission/${active.id}`);
                }}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={
                  active.status === "expired"
                    ? `${t("home.continueAriaExpired")} : ${active.label}`
                    : `${t("home.continueAria")} : ${active.label}, ${active.subtitle}`
                }
              >
                <div
                  aria-hidden="true"
                  className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    active.status === "expired" ? "bg-warning/15" : "bg-primary/10",
                  ].join(" ")}
                >
                  {active.status === "expired" ? (
                    <AlertTriangle size={18} className="text-warning" />
                  ) : active.kind === "voyage" ? (
                    <Plane size={18} className="text-primary" />
                  ) : (
                    <Package size={18} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={[
                      "text-[11px] font-semibold uppercase tracking-wider",
                      active.status === "expired" ? "text-warning" : "text-primary",
                    ].join(" ")}
                  >
                    {active.status === "expired"
                      ? t("home.expiredLabel")
                      : t("home.continueLabel")}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {active.label}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{active.subtitle}</span>
                    {active.date && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} aria-hidden="true" /> {formattedDate(active.date)}
                      </span>
                    )}
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  size={18}
                  className="text-muted-foreground shrink-0"
                />
              </motion.button>
            ) : (
              <GettingStartedChecklist />
            )}
          </section>

          {/* Raccourcis discrets — prefetch au hover/focus */}
          <section aria-label={t("home.shortcutsAria")}>
            <div className="grid grid-cols-3 gap-2">
              {shortcuts.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    trackEvent("home_shortcut_click", "navigation", { shortcut: s.key });
                    navigate(s.to);
                  }}
                  onMouseEnter={() => handlePrefetch(s.hub)}
                  onFocus={() => handlePrefetch(s.hub)}
                  onTouchStart={() => handlePrefetch(s.hub)}
                  className="flex flex-col items-center justify-center gap-1.5 bg-card border border-border rounded-2xl py-3 hover:border-primary/40 transition outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={s.label}
                >
                  <s.icon size={18} className="text-foreground" aria-hidden="true" />
                  <span className="text-[11px] font-medium text-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Lien discret vers l'ancien tableau de bord */}
          <div className="text-center">
            <button
              onClick={() => navigate("/dashboard-classic")}
              className="text-xs text-muted-foreground hover:text-foreground transition outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
            >
              {t("home.openClassic")}
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default HomePage;
