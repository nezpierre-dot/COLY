import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  PackagePlus,
  Search,
  HandshakeIcon,
  ShieldCheck,
  Plane,
  MapPin,
  CheckCircle2,
  Star,
  Wallet,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export default function HowItWorks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const lineProgress = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);

  const SETUP_STEPS = useMemo(
    () => [
      { icon: PackagePlus, color: "from-primary to-primary/60", title: t("howItWorks.step1.title"), desc: t("howItWorks.step1.desc") },
      { icon: Search, color: "from-success to-success/60", title: t("howItWorks.step2.title"), desc: t("howItWorks.step2.desc") },
      { icon: HandshakeIcon, color: "from-amber-500 to-amber-300", title: t("howItWorks.step3.title"), desc: t("howItWorks.step3.desc") },
      { icon: ShieldCheck, color: "from-violet-500 to-violet-300", title: t("howItWorks.step4.title"), desc: t("howItWorks.step4.desc") },
      { icon: CheckCircle2, color: "from-blue-500 to-cyan-400", title: t("howItWorks.step5.title"), desc: t("howItWorks.step5.desc") },
    ],
    [t],
  );

  const TRUST_POINTS = useMemo(
    () => [
      { icon: Lock, t: t("howItWorks.trust1.t"), d: t("howItWorks.trust1.d") },
      { icon: ShieldCheck, t: t("howItWorks.trust2.t"), d: t("howItWorks.trust2.d") },
      { icon: Star, t: t("howItWorks.trust3.t"), d: t("howItWorks.trust3.d") },
      { icon: Wallet, t: t("howItWorks.trust4.t"), d: t("howItWorks.trust4.d") },
    ],
    [t],
  );

  const TRAVELER_PERKS = useMemo(
    () => [
      t("howItWorks.travelerPerk1"),
      t("howItWorks.travelerPerk2"),
      t("howItWorks.travelerPerk3"),
    ],
    [t],
  );

  useEffect(() => {
    document.title = `${t("howItWorks.metaTitle")} — Nidit`;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", t("howItWorks.metaDesc"));
  }, [t]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Nidit
          </Link>
          <div className="flex items-center gap-2">
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

      {/* Hero with animated plane */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-success/10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {t("howItWorks.badge")}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {t("howItWorks.heroTitle1")}
              <br />
              <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                {t("howItWorks.heroTitle2")}
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {t("howItWorks.heroDesc")}
            </p>
          </motion.div>

          {/* Animated journey illustration */}
          <div className="relative mx-auto mt-14 h-32 max-w-3xl">
            <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2" viewBox="0 0 600 40" preserveAspectRatio="none" width="100%" height="40">
              <motion.path
                d="M 20 20 Q 200 -10 300 20 T 580 20"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="6 6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
              />
            </svg>
            <div className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-center">
              <div className="rounded-full bg-primary p-2 text-primary-foreground shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="mt-1 text-xs font-semibold text-muted-foreground">Paris</span>
            </div>
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 text-primary"
              initial={{ left: "5%" }}
              animate={{ left: "92%" }}
              transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "loop" }}
            >
              <Plane className="h-7 w-7 -rotate-12 drop-shadow-lg" />
            </motion.div>
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col items-center">
              <div className="rounded-full bg-success p-2 text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="mt-1 text-xs font-semibold text-muted-foreground">Dakar</span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps timeline */}
      <section className="relative mx-auto max-w-3xl px-4 py-16">
        <div className="absolute bottom-0 left-8 top-0 hidden w-0.5 overflow-hidden rounded-full bg-border md:block">
          <motion.div
            className="h-full origin-top bg-gradient-to-b from-primary via-success to-blue-500"
            style={{ scaleY: lineProgress }}
          />
        </div>

        <div className="space-y-8 md:space-y-12">
          {SETUP_STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative flex items-start gap-5 md:pl-4"
            >
              <motion.div
                whileHover={{ scale: 1.08, rotate: -3 }}
                className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-xl`}
              >
                <s.icon className="h-7 w-7" />
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground shadow-md">
                  {i + 1}
                </div>
              </motion.div>
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust grid */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-center text-3xl font-bold md:text-4xl"
          >
            {t("howItWorks.trustTitle")}
          </motion.h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            {t("howItWorks.trustDesc")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((b, i) => (
              <motion.div
                key={b.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold">{b.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For travelers */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Users className="h-3 w-3" />
              {t("howItWorks.travelerBadge")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("howItWorks.travelerTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("howItWorks.travelerDesc")}
            </p>
            <ul className="mt-5 space-y-2.5">
              {TRAVELER_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 gap-2" onClick={() => navigate("/signup")}>
              {t("howItWorks.becomeTraveler")} <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative h-72"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -8, 0],
                  rotate: [(i - 1) * 4, (i - 1) * 4 - 1, (i - 1) * 4],
                }}
                transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
                className="absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-xl"
                style={{ zIndex: 3 - i, marginTop: i * 16, marginLeft: i * 12 }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground">VOY-{1024 + i}</div>
                  <div className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    +{45 + i * 10}€
                  </div>
                </div>
                <div className="mt-2 text-base font-semibold">
                  Paris → {["Dakar", "Abidjan", "Casablanca"][i]}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {["3 kg", "5 kg", "2 kg"][i]} • {[t("howItWorks.modeAir"), t("howItWorks.modeAir"), t("howItWorks.modeTrain")][i]}
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">{t("howItWorks.ctaTitle")}</h2>
        <p className="mt-3 text-muted-foreground">
          {t("howItWorks.ctaDesc")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/signup")} className="gap-2">
            {t("howItWorks.ctaPrimary")} <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/explore")}>
            {t("howItWorks.ctaSecondary")}
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nidit •{" "}
        <Link to="/terms" className="hover:underline">{t("publicFooter.terms")}</Link> •{" "}
        <Link to="/confidentialite" className="hover:underline">{t("publicFooter.privacy")}</Link>
      </footer>
    </div>
  );
}
