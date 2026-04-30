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
  AlertTriangle,
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

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="" aria-hidden="true" className="w-9 h-9 rounded-xl" />
            <div>
              <p className="text-xs text-muted-foreground leading-none">{greeting}</p>
              <p className="text-base font-semibold text-foreground leading-tight">
                {firstName || t("home.welcomeFallback")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate("/my-account")}
              aria-label={t("home.openAccount")}
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-sm font-semibold text-foreground" aria-hidden="true">
                {firstName ? firstName[0]?.toUpperCase() : "·"}
              </span>
            </button>
          </div>
        </header>

        <main id="home-main">
          {/* Question principale */}
          <section className="px-5 pt-2 pb-5">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {t("home.question")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("home.subtitle")}</p>
          </section>

          {/* Live region pour annoncer le toggle de rôle */}
          <div className="sr-only" role="status" aria-live="polite">
            {switching ? t("home.switching") : ""}
          </div>

          {/* 2 gros CTA */}
          <section
            className="px-5"
            role="group"
            aria-labelledby="home-cta-label"
          >
            <span id="home-cta-label" className="sr-only">
              {t("home.ctaGroupAria")}
            </span>
            <div className="grid grid-cols-1 gap-3">
              <motion.button
                onClick={handleSend}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-left shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={t("home.ctaSendAria")}
              >
                <div
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary-foreground/10"
                />
                <div
                  aria-hidden="true"
                  className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-primary-foreground/5"
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div
                      aria-hidden="true"
                      className="w-11 h-11 rounded-2xl bg-primary-foreground/15 flex items-center justify-center mb-3"
                    >
                      <Send size={22} className="text-primary-foreground" />
                    </div>
                    <p className="text-xl font-bold text-primary-foreground">
                      {t("home.ctaSendTitle")}
                    </p>
                    <p className="text-sm text-primary-foreground/80 mt-0.5">
                      {t("home.ctaSendSubtitle")}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={22}
                    className="text-primary-foreground/80 group-hover:translate-x-1 transition-transform shrink-0 mt-1"
                  />
                </div>
              </motion.button>

              <motion.button
                ref={transportBtnRef}
                onClick={handleTransport}
                aria-disabled={switching}
                aria-busy={switching}
                whileTap={{ scale: switching ? 1 : 0.98 }}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent/80 p-5 text-left shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:opacity-70 aria-disabled:cursor-progress"
                aria-label={
                  isVoyageur
                    ? t("home.ctaTransportAria")
                    : t("home.ctaTransportSwitchAria")
                }
              >
                <div
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-accent-foreground/10"
                />
                <div
                  aria-hidden="true"
                  className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-accent-foreground/5"
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div
                      aria-hidden="true"
                      className="w-11 h-11 rounded-2xl bg-accent-foreground/15 flex items-center justify-center mb-3"
                    >
                      <Plane size={22} className="text-accent-foreground" />
                    </div>
                    <p className="text-xl font-bold text-accent-foreground">
                      {t("home.ctaTransportTitle")}
                    </p>
                    <p className="text-sm text-accent-foreground/80 mt-0.5">
                      {switching ? t("home.switching") : t("home.ctaTransportSubtitle")}
                    </p>
                    {!isVoyageur && !switching && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-accent-foreground/90 bg-accent-foreground/10 rounded-full px-2 py-0.5">
                        <Sparkles size={10} aria-hidden="true" /> {t("home.autoSwitchHint")}
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={22}
                    className="text-accent-foreground/80 group-hover:translate-x-1 transition-transform shrink-0 mt-1"
                  />
                </div>
              </motion.button>
            </div>
          </section>

          {/* Section contextuelle */}
          <section
            className="px-5 mt-6"
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
          <section className="px-5 mt-6" aria-label={t("home.shortcutsAria")}>
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
          <div className="px-5 mt-6 text-center">
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
