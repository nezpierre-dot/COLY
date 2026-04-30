/**
 * HomePage — Home unifiée B2C "Que veux-tu faire aujourd'hui ?"
 *
 * Remplace l'ancien Dashboard riche (toujours accessible via /dashboard-classic).
 * Architecture :
 *  - 2 gros CTA (Envoyer / Transporter) — décision instantanée
 *  - "Transporter" bascule automatiquement le rôle si nécessaire (1 tap)
 *  - Section contextuelle intelligente :
 *      • Action en cours (1er voyage/colis actif) si elle existe
 *      • Sinon : GettingStartedChecklist (déjà adaptative)
 *  - 3 raccourcis discrets (Activité, Wallet, Matches)
 *
 * Décisions UX :
 *  - Dark mode, design tokens uniquement (jamais de couleur en dur)
 *  - Animations framer-motion (entrée staggered, tap feedback)
 *  - Tutoiement, wording validé en mémoire ("Envoie", "Transporte")
 *  - Analytics : home_view, home_cta_click {action: send|transport}
 */
import { useEffect, useMemo, useState } from "react";
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
import { prefetchAllHubsOnIdle } from "@/features/core/hubs/prefetch";
import { toast } from "sonner";
import appLogo from "@/assets/logo.png";

type ActiveItem =
  | { kind: "voyage"; id: string; label: string; date: string | null }
  | { kind: "shipment"; id: string; label: string; date: string | null }
  | { kind: "mission"; id: string; label: string; date: string | null };

const HomePage = () => {
  const navigate = useNavigate();
  const { user, roles, refresh } = useAuth() as ReturnType<typeof useAuth> & { refresh?: () => Promise<void> };
  const { t } = useTranslation();
  const isVoyageur = roles.includes("voyageur");

  const [firstName, setFirstName] = useState<string>("");
  const [active, setActive] = useState<ActiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // ── Prefetch hub chunks idle pour fluidifier la navigation suivante
  useEffect(() => {
    prefetchAllHubsOnIdle();
  }, []);

  // ── Greeting + 1ʳᵉ action en cours
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
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

      // Choix de l'action en cours la plus pertinente
      const v = voyageRes.data?.[0];
      const s = shipRes.data?.[0];
      const m = missionRes.data?.[0];
      let chosen: ActiveItem | null = null;
      if (v) {
        chosen = {
          kind: "voyage",
          id: v.id,
          label: `${v.departure_city} → ${v.arrival_city}`,
          date: v.departure_date,
        };
      } else if (s) {
        chosen = {
          kind: "shipment",
          id: s.id,
          label: `${t("home.shipmentTo")} ${s.arrival_city}`,
          date: s.created_at,
        };
      } else if (m) {
        chosen = {
          kind: "mission",
          id: m.id,
          label: `${t("home.missionIn")} ${m.city}`,
          date: m.created_at,
        };
      }
      setActive(chosen);
      setLoading(false);

      trackEvent("home_view", "navigation", {
        has_active: !!chosen,
        role: isVoyageur ? "voyageur" : "demandeur",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isVoyageur, t]);

  // ── CTA principal : Envoyer un colis (Demandeur)
  const handleSend = () => {
    hapticLight();
    trackEvent("home_cta_click", "navigation", { action: "send" });
    navigate("/send-coly");
  };

  // ── CTA secondaire : Transporter (bascule auto le rôle si besoin)
  const handleTransport = async () => {
    hapticLight();
    trackEvent("home_cta_click", "navigation", { action: "transport", needs_switch: !isVoyageur });

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
      // Rafraîchir le contexte rôle puis naviguer
      if (typeof refresh === "function") await refresh();
      navigate("/new-trip");
    } catch (e: any) {
      toast.error(e?.message || t("home.switchError"));
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

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="Nidit" className="w-9 h-9 rounded-xl" />
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
              className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition flex items-center justify-center"
            >
              <span className="text-sm font-semibold text-foreground">
                {firstName ? firstName[0]?.toUpperCase() : "·"}
              </span>
            </button>
          </div>
        </header>

        {/* Question principale */}
        <section className="px-5 pt-2 pb-5">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {t("home.question")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("home.subtitle")}</p>
        </section>

        {/* 2 gros CTA */}
        <section className="px-5">
          <div className="grid grid-cols-1 gap-3">
            <motion.button
              onClick={handleSend}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-left shadow-lg"
              aria-label={t("home.ctaSendAria")}
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary-foreground/10" />
              <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-primary-foreground/5" />
              <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary-foreground/15 flex items-center justify-center mb-3">
                    <Send size={22} className="text-primary-foreground" />
                  </div>
                  <p className="text-xl font-bold text-primary-foreground">{t("home.ctaSendTitle")}</p>
                  <p className="text-sm text-primary-foreground/80 mt-0.5">
                    {t("home.ctaSendSubtitle")}
                  </p>
                </div>
                <ArrowRight
                  size={22}
                  className="text-primary-foreground/80 group-hover:translate-x-1 transition-transform shrink-0 mt-1"
                />
              </div>
            </motion.button>

            <motion.button
              onClick={handleTransport}
              disabled={switching}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent/80 p-5 text-left shadow-lg disabled:opacity-70"
              aria-label={t("home.ctaTransportAria")}
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-accent-foreground/10" />
              <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-accent-foreground/5" />
              <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-accent-foreground/15 flex items-center justify-center mb-3">
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
                      <Sparkles size={10} /> {t("home.autoSwitchHint")}
                    </span>
                  )}
                </div>
                <ArrowRight
                  size={22}
                  className="text-accent-foreground/80 group-hover:translate-x-1 transition-transform shrink-0 mt-1"
                />
              </div>
            </motion.button>
          </div>
        </section>

        {/* Section contextuelle : action en cours OU checklist */}
        <section className="px-5 mt-6">
          {!loading && active && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (active.kind === "voyage") navigate(`/voyage/${active.id}`);
                else if (active.kind === "shipment") navigate(`/shipment/${active.id}`);
                else navigate(`/mission/${active.id}`);
              }}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition text-left"
              aria-label={t("home.continueAria")}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {active.kind === "voyage" ? (
                  <Plane size={18} className="text-primary" />
                ) : (
                  <Package size={18} className="text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {t("home.continueLabel")}
                </p>
                <p className="text-sm font-medium text-foreground truncate">{active.label}</p>
                {active.date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {formattedDate(active.date)}
                  </p>
                )}
              </div>
              <ArrowRight size={18} className="text-muted-foreground shrink-0" />
            </motion.button>
          )}
          {!loading && !active && <GettingStartedChecklist />}
        </section>

        {/* Raccourcis discrets */}
        <section className="px-5 mt-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: "activity",
                icon: ListChecks,
                label: t("home.shortcutActivity"),
                to: "/activity",
              },
              {
                key: "wallet",
                icon: Wallet,
                label: t("home.shortcutWallet"),
                to: "/wallet",
              },
              {
                key: "progression",
                icon: Sparkles,
                label: t("home.shortcutProgression"),
                to: "/progression",
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  trackEvent("home_shortcut_click", "navigation", { shortcut: s.key });
                  navigate(s.to);
                }}
                className="flex flex-col items-center justify-center gap-1.5 bg-card border border-border rounded-2xl py-3 hover:border-primary/40 transition"
              >
                <s.icon size={18} className="text-foreground" />
                <span className="text-[11px] font-medium text-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Lien discret vers l'ancien tableau de bord (power users / admins) */}
        <div className="px-5 mt-6 text-center">
          <button
            onClick={() => navigate("/dashboard-classic")}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            {t("home.openClassic")}
          </button>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default HomePage;
