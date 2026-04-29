import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Plane, Search, Sparkles, ShieldCheck, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Testimonials from "@/components/Testimonials";
import { useTranslation } from "@/hooks/useTranslation";

interface PopularRoute {
  departure_city: string;
  arrival_city: string;
  arrival_country: string;
  voyage_count: number;
}

interface PublicVoyage {
  id: string;
  ref_number: string;
  departure_city: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  transport_method: string;
}

export default function PublicLanding() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [voyages, setVoyages] = useState<PublicVoyage[]>([]);
  const [stats, setStats] = useState({ voyages: 0 });

  useEffect(() => {
    document.title = `Nidit — ${t("publicLanding.metaTitle")}`;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", t("publicLanding.metaDesc"));

    (async () => {
      const [{ data: r }, { data: v }] = await Promise.all([
        supabase.rpc("get_popular_routes", { _limit: 8 }),
        supabase.rpc("get_public_voyages", { _limit: 6 }),
      ]);
      if (r) setRoutes(r as any);
      if (v) {
        setVoyages(v as any);
        setStats({ voyages: v.length });
      }
    })();
  }, [t]);

  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;

  const trustPoints = [
    { icon: ShieldCheck, t: t("publicLanding.trust1.t"), d: t("publicLanding.trust1.d") },
    { icon: Globe2, t: t("publicLanding.trust2.t"), d: t("publicLanding.trust2.d") },
    { icon: Plane, t: t("publicLanding.trust3.t"), d: t("publicLanding.trust3.d") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Nidit
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/comment-ca-marche")} className="hidden sm:inline-flex">
              {t("publicNav.howItWorks")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
              {t("publicNav.explore")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              {t("publicNav.login")}
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              {t("publicCommon.signUp")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-success/10" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {stats.voyages > 0 ? t("publicLanding.activeTrips", { count: stats.voyages }) : t("publicLanding.newTripsDaily")}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {t("publicLanding.heroTitle1")}<br />
              <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                {t("publicLanding.heroTitle2")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {t("publicLanding.heroDesc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/signup")} className="gap-2">
                {t("publicLanding.startNow")} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/explore")}>
                {t("publicLanding.seeTrips")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
          {trustPoints.map((b) => (
            <div key={b.t} className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <b.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">{b.t}</div>
                <div className="text-sm text-muted-foreground">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular routes */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t("publicLanding.popularTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("publicLanding.popularDesc")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")} className="gap-1">
            {t("publicLanding.seeAll")} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {routes.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : (
            routes.map((r, i) => (
              <motion.button
                key={`${r.departure_city}-${r.arrival_city}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/explore?to=${encodeURIComponent(r.arrival_country)}`)}
                className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-card/80"
              >
                <div className="text-sm font-semibold">
                  {r.departure_city} → {r.arrival_city}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{r.arrival_country}</div>
                <div className="mt-2 text-xs font-semibold text-primary">
                  {r.voyage_count > 1
                    ? t("publicLanding.travelers_plural", { count: r.voyage_count })
                    : t("publicLanding.travelers_one", { count: r.voyage_count })}
                </div>
              </motion.button>
            ))
          )}
        </div>
      </section>

      {/* Recent voyages */}
      <section className="bg-card/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold md:text-3xl">{t("publicLanding.availableNow")}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {voyages.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="text-xs font-semibold text-muted-foreground">{v.ref_number}</div>
                <div className="mt-1 text-base font-semibold">
                  {v.departure_city} → {v.arrival_city}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(v.departure_date).toLocaleDateString(localeTag, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })} • {v.transport_method}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => navigate(`/trajet/${v.id}`)}
                >
                  {t("publicLanding.viewTrip")}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Search className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h2 className="text-3xl font-bold md:text-4xl">{t("publicLanding.ctaTitle")}</h2>
        <p className="mt-3 text-muted-foreground">
          {t("publicLanding.ctaDesc")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/signup")}>
            {t("publicLanding.createAccount")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/explore")}>
            {t("publicLanding.continueAsGuest")}
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nidit • <Link to="/terms" className="hover:underline">{t("publicFooter.terms")}</Link> •{" "}
        <Link to="/confidentialite" className="hover:underline">{t("publicFooter.privacy")}</Link>
      </footer>
    </div>
  );
}
