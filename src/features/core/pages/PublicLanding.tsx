import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Plane, Search, Sparkles, ShieldCheck, Globe2, Package, Wallet, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Testimonials from "@/components/Testimonials";
import Nido from "@/components/Nido";
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

  const steps = [
    { pose: "search" as const, num: "01", title: t("publicLanding.step1Title"), desc: t("publicLanding.step1Desc") },
    { pose: "fly" as const, num: "02", title: t("publicLanding.step2Title"), desc: t("publicLanding.step2Desc") },
    { pose: "celebrate" as const, num: "03", title: t("publicLanding.step3Title"), desc: t("publicLanding.step3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Nido pose="hello" size="xs" animate="wiggle" />
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

      {/* Hero — asymmetric, bold */}
      <section className="relative overflow-hidden">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-success/20 blur-[120px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {stats.voyages > 0 ? t("publicLanding.activeTrips", { count: stats.voyages }) : t("publicLanding.newTripsDaily")}
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              {t("publicLanding.heroTitle1")}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-success bg-clip-text text-transparent">
                {t("publicLanding.heroTitle2")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {t("publicLanding.heroDesc")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/signup")} className="gap-2 rounded-2xl shadow-lg shadow-primary/30">
                {t("publicLanding.startNow")} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/explore")} className="rounded-2xl">
                {t("publicLanding.seeTrips")}
              </Button>
            </div>

            {/* Mini social proof */}
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-success/40"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-semibold text-foreground">4.9/5</span>
                <span className="hidden sm:inline">— {t("publicLanding.lovedBy")}</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Nido hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 120, damping: 18 }}
            className="relative flex items-center justify-center"
          >
            {/* Halo */}
            <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-gradient-to-br from-primary/30 to-success/20 blur-3xl" />
            {/* Floating nest pad */}
            <div className="relative flex h-80 w-80 items-center justify-center md:h-96 md:w-96">
              <div className="absolute inset-0 rounded-[40%] bg-gradient-to-br from-primary/15 to-transparent" />
              <Nido pose="fly" size="xl" animate="float" priority className="relative z-10 scale-125" />
              {/* Floating orbits */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-card/80 p-2 shadow-lg backdrop-blur">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 shadow-lg backdrop-blur">
                  <Globe2 className="h-4 w-4 text-success" />
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-card/80 p-2 shadow-lg backdrop-blur">
                  <Wallet className="h-4 w-4 text-amber-500" />
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 shadow-lg backdrop-blur">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
          {trustPoints.map((b, i) => (
            <motion.div
              key={b.t}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3"
            >
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <b.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">{b.t}</div>
                <div className="text-sm text-muted-foreground">{b.d}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works — Nido storytelling */}
      <section className="relative mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-success">
            {t("publicLanding.howItWorksKicker")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {t("publicLanding.howItWorksTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("publicLanding.howItWorksDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="pointer-events-none absolute -top-2 -right-2 text-[7rem] font-black leading-none text-primary/5 transition group-hover:text-primary/10">
                {s.num}
              </div>
              <div className="relative flex h-32 items-center justify-center">
                <Nido pose={s.pose} size="lg" animate="float" />
              </div>
              <div className="relative mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("publicLanding.stepLabel", { num: s.num })}
                </div>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
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
          {routes.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
              ))
            : routes.map((r, i) => (
                <motion.button
                  key={`${r.departure_city}-${r.arrival_city}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
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
              ))}
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
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
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
                  })}{" "}
                  • {v.transport_method}
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

      {/* Final CTA — bold with celebrating Nido */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-success/15" />
        <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-3xl px-4 text-center"
        >
          <div className="mb-6 flex justify-center">
            <Nido pose="celebrate" size="lg" animate="bounce" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">{t("publicLanding.ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("publicLanding.ctaDesc")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/signup")} className="gap-2 rounded-2xl shadow-lg shadow-primary/30">
              {t("publicLanding.createAccount")} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/explore")} className="rounded-2xl">
              {t("publicLanding.continueAsGuest")}
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nidit •{" "}
        <Link to="/terms" className="hover:underline">
          {t("publicFooter.terms")}
        </Link>{" "}
        •{" "}
        <Link to="/confidentialite" className="hover:underline">
          {t("publicFooter.privacy")}
        </Link>
        <div className="mt-3 flex justify-center">
          <GlossaryButton variant="subtle" />
        </div>
      </footer>
    </div>
  );
}
