/**
 * Nidit — PublicLanding (refonte conversion-first, esprit "Future")
 *
 * Drop-in replacement pour : src/features/core/pages/PublicLanding.tsx
 *
 * Ce que ça apporte vs l'ancien :
 *  - Hero ultra-clair avec value prop chiffrée + démo animée du parcours
 *  - Social proof immédiate (marquee stats + note moyenne)
 *  - 2 CTA différenciés : "Envoyer un colis" (primary) vs "Devenir voyageur"
 *  - Section garanties (KYC, paiement bloqué, code conf, assurance)
 *  - Comparateur visuel Nidit vs Poste classique
 *  - Spotlight NeedIt (différenciateur clé du produit)
 *  - Testimonials avec étoiles + photo
 *  - FAQ (collapsible, accessible)
 *  - Final CTA + footer minimaliste
 *  - Mobile-first → desktop, prefers-reduced-motion respecté, RTL-safe
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Package,
  Plane,
  ShieldCheck,
  Lock,
  KeyRound,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Star,
  MapPin,
  Clock,
  Wallet,
  Heart,
  CheckCircle2,
  Globe,
  Camera,
  MessageCircle,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const HERO_STATS = [
  { value: "+12 400", label: "colis livrés" },
  { value: "94 pays", label: "couverts" },
  { value: "4.8 / 5", label: "note moyenne" },
  { value: "−45 %", label: "vs la poste" },
  { value: "98 %", label: "livrés à temps" },
  { value: "+8 200", label: "voyageurs vérifiés" },
];

const HOW_IT_WORKS = [
  { step: "1", icon: Package, title: "Tu déposes", desc: "Décris ton colis ou ta mission NeedIt en 30 secondes. Photo, poids, dimensions, valeur.", accent: "primary" as const },
  { step: "2", icon: Plane, title: "Tu matches", desc: "Un voyageur vérifié sur ton trajet accepte ta demande. Tu valides son profil et son prix.", accent: "secondary" as const },
  { step: "3", icon: CheckCircle2, title: "C'est livré", desc: "Code de confirmation à la remise, paiement débloqué. Tu notes ton voyageur.", accent: "success" as const },
];

const TRUST_PILLARS = [
  { icon: ShieldCheck, title: "Identité vérifiée (KYC)", desc: "Carte d'identité + selfie pour chaque voyageur. Pas d'anonymat possible." },
  { icon: Lock, title: "Paiement bloqué", desc: "Ton paiement est mis en séquestre Stripe. Le voyageur n'est payé qu'après confirmation de la livraison." },
  { icon: KeyRound, title: "Code de confirmation", desc: "Un code unique remis par le destinataire au voyageur. Sans code, pas de paiement." },
  { icon: Heart, title: "Assurance incluse", desc: "Jusqu'à 500 € de couverture en cas de perte, vol ou casse — sur tous les colis." },
];

const COMPARISON_ROWS = [
  { label: "Prix moyen Paris → Marseille (2 kg)", nidit: "9 €", poste: "16,50 €" },
  { label: "Délai de livraison", nidit: "Sur le trajet (24-48 h)", poste: "3-5 jours" },
  { label: "Suivi en temps réel", nidit: "Géolocalisation live", poste: "Scan ponctuel" },
  { label: "Photo à la livraison", nidit: "Oui, avec géo-tag", poste: "Non" },
  { label: "Empreinte carbone", nidit: "Mutualisée (~0 g CO₂)", poste: "Camion / avion dédié" },
  { label: "Contact humain", nidit: "Chat direct + appel", poste: "Hotline générique" },
];

const TESTIMONIALS = [
  { name: "Léa, Lyon", role: "Étudiante", avatar: "https://i.pravatar.cc/96?img=47", rating: 5, quote: "J'ai envoyé un cadeau d'anniv à ma sœur à Marseille pour 8 €. Livré dans la journée par un mec super sympa. Bye bye la poste." },
  { name: "Karim, Paris", role: "Voyageur fréquent", avatar: "https://i.pravatar.cc/96?img=12", rating: 5, quote: "Je fais Paris–Casa toutes les 3 semaines. Avec Nidit je rentabilise mon trajet et je rends service. +400 €/mois facile." },
  { name: "Sandra, Bordeaux", role: "Maman expat", avatar: "https://i.pravatar.cc/96?img=32", rating: 5, quote: "NeedIt m'a sauvée : j'ai pu commander des produits introuvables ici. Une voyageuse les a achetés à Paris et livrés en 36 h." },
];

const FAQ_ITEMS = [
  { q: "Comment Nidit garantit la sécurité du colis ?", a: "Chaque voyageur est vérifié (KYC + selfie). Le paiement est bloqué jusqu'à la livraison confirmée par un code unique. Une assurance jusqu'à 500 € couvre la perte, le vol ou la casse. Tu peux suivre ton colis en temps réel sur la carte." },
  { q: "Combien ça coûte vraiment ?", a: "Le prix est libre, négocié entre toi et le voyageur. En moyenne, c'est 30 à 50 % moins cher que la poste classique. Nidit prélève 12 % de commission qui couvre le paiement sécurisé, l'assurance et le support." },
  { q: "Et si le voyageur ne livre pas ?", a: "Sans code de confirmation, le paiement n'est jamais débloqué. Tu es remboursé intégralement. Notre équipe support intervient sous 2 h en cas de litige et l'assurance prend le relais si besoin." },
  { q: "Je voyage souvent. Combien je peux gagner ?", a: "Un voyageur actif gagne en moyenne 200 à 600 € par mois selon la fréquence et la longueur des trajets. Tu fixes tes prix et tu choisis ce que tu acceptes — tu ne fais que les trajets que tu prévois déjà." },
  { q: "C'est quoi NeedIt ?", a: "NeedIt te permet de demander à un voyageur d'acheter un produit pour toi sur son trajet. Le voyageur achète, tu rembourses + payes le service de livraison. Idéal pour les produits introuvables localement." },
  { q: "C'est légal de transporter un colis pour quelqu'un ?", a: "Oui, tant que le contenu est légal et déclaré. Nidit interdit strictement les objets dangereux, illégaux ou périssables. Chaque colis est photographié à la prise en charge." },
];

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-16">
        <Link to="/" className="flex items-center gap-2 focus-ring rounded-lg" aria-label="Nidit — Accueil">
          <div className="w-9 h-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Package className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">Nidit</span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/comment-ca-marche" className="hover:text-primary transition-colors">Comment ça marche</Link>
          <Link to="/explore" className="hover:text-primary transition-colors">Trajets disponibles</Link>
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden sm:inline-flex tap-target px-4 rounded-full text-sm font-semibold hover:bg-muted transition-colors">Se connecter</Link>
          <Link to="/signup" className="btn-cta-primary text-sm h-11 px-5">S'inscrire</Link>
        </div>
      </div>
    </header>
  );
}

function StatsMarquee() {
  const reduce = useReducedMotion();
  const items = useMemo(() => [...HERO_STATS, ...HERO_STATS], []);
  return (
    <div className="overflow-hidden border-y border-border/60 bg-card/40 backdrop-blur-sm">
      <div className={reduce ? "flex gap-12 px-5 py-4" : "marquee py-4"} aria-label="Statistiques Nidit">
        {items.map((s, i) => (
          <div key={i} className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="stat-number text-title text-[hsl(220_90%_30%)] dark:text-[hsl(218_100%_75%)]">{s.value}</span>
            <span className="text-body-small text-muted-foreground">{s.label}</span>
            <span className="mx-6 text-border" aria-hidden="true">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroIllustration() {
  const reduce = useReducedMotion();
  return (
    <div className="relative aspect-[4/3] sm:aspect-[5/4] w-full" role="img" aria-label="Illustration : un voyageur transporte un colis le long d'un trajet pointillé">
      <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.18)" />
            <stop offset="100%" stopColor="hsl(var(--secondary) / 0.18)" />
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 0% 100%)" />
            <stop offset="100%" stopColor="hsl(240 40% 99%)" />
          </linearGradient>
        </defs>
        <circle cx="250" cy="200" r="180" fill="url(#bgGrad)" opacity="0.7" />
        <rect x="40" y="80" width="420" height="260" rx="32" fill="url(#cardGrad)" stroke="hsl(var(--border))" />
        <circle cx="100" cy="160" r="10" fill="hsl(var(--primary))" />
        <circle cx="100" cy="160" r="20" fill="hsl(var(--primary) / 0.18)" />
        <text x="100" y="200" textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--foreground))">Paris</text>
        <circle cx="400" cy="280" r="10" fill="hsl(var(--secondary-strong, var(--secondary)))" />
        <circle cx="400" cy="280" r="20" fill="hsl(var(--secondary) / 0.25)" />
        <text x="400" y="320" textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--foreground))">Marseille</text>
        <path d="M 100 160 Q 250 100 280 220 T 400 280" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" className={reduce ? "" : "route-dash-anim"} />
        <motion.g initial={false} animate={reduce ? {} : { y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="250" cy="160" r="36" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="3" />
          <circle cx="250" cy="150" r="14" fill="hsl(var(--secondary-strong, var(--secondary)))" />
          <path d="M 226 180 Q 250 200 274 180 L 274 192 Q 250 210 226 192 Z" fill="hsl(var(--secondary-strong, var(--secondary)))" />
          <rect x="270" y="170" width="22" height="22" rx="4" fill="hsl(var(--accent))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <line x1="270" y1="181" x2="292" y2="181" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <line x1="281" y1="170" x2="281" y2="192" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        </motion.g>
        <motion.g initial={false} animate={reduce ? {} : { y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
          <rect x="60" y="300" width="120" height="36" rx="18" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
          <circle cx="80" cy="318" r="6" fill="hsl(var(--success))" />
          <text x="92" y="322" fontSize="12" fontWeight="600" fill="hsl(var(--foreground))">Karim · 4.9★</text>
        </motion.g>
        <motion.g initial={false} animate={reduce ? {} : { y: [0, 4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>
          <rect x="320" y="100" width="130" height="36" rx="18" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
          <text x="335" y="123" fontSize="12" fontWeight="700" fill="hsl(var(--primary))">9 € · 24 h</text>
        </motion.g>
      </svg>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full opacity-50 blur-3xl pointer-events-none" style={{ background: "hsl(var(--secondary) / 0.45)" }} aria-hidden="true" />
      <div className="absolute -bottom-40 -left-20 w-[24rem] h-[24rem] rounded-full opacity-40 blur-3xl pointer-events-none" style={{ background: "hsl(var(--primary) / 0.45)" }} aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <span className="chip-info mb-5"><Sparkles className="w-3.5 h-3.5" aria-hidden="true" />La poste collaborative qui marche</span>
          <h1 className="text-display-lg mb-6">Vos colis voyagent <br className="hidden sm:block" /><span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>avec des humains.</span></h1>
          <p className="text-body-lg text-muted-foreground max-w-xl mb-8">Envoyez un colis ou demandez un produit à l'étranger via un voyageur vérifié. <strong className="text-foreground">2 fois plus rapide</strong>, <strong className="text-foreground">jusqu'à 50 % moins cher</strong> que la poste, et <strong className="text-foreground">100 % humain</strong>.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
            <Link to="/signup?role=sender" className="btn-cta-primary"><Package className="w-5 h-5" aria-hidden="true" />Envoyer un colis<ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
            <Link to="/signup?role=traveler" className="btn-cta-secondary"><Plane className="w-5 h-5" aria-hidden="true" />Devenir voyageur</Link>
          </div>
          <div className="flex items-center gap-3 text-body-small text-muted-foreground">
            <div className="flex -space-x-2">{[12, 32, 47, 5].map((i) => (<img key={i} src={`https://i.pravatar.cc/40?img=${i}`} alt="" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-background" loading="lazy" aria-hidden="true" />))}</div>
            <div><div className="flex items-center gap-1 text-foreground font-semibold"><Star className="w-4 h-4 fill-warning text-warning" aria-hidden="true" /><span>4.8 / 5</span><span className="text-muted-foreground font-normal">· 12 400 colis livrés</span></div></div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}>
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="section-pad" aria-labelledby="how-it-works-title">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-overline mb-3 block">Comment ça marche</span>
          <h2 id="how-it-works-title" className="text-display-sm">3 étapes, et c'est livré.</h2>
        </div>
        <ol className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon;
            const tone = s.accent === "primary" ? "tone-primary" : s.accent === "secondary" ? "tone-secondary" : "tone-success";
            return (
              <motion.li key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, delay: i * 0.08 }} className={`stat-card-future ${tone} hover-lift list-none`}>
                <div className="stat-icon"><Icon className="w-5 h-5" aria-hidden="true" /></div>
                <span className="text-overline">Étape {s.step}</span>
                <h3 className="text-title-sm">{s.title}</h3>
                <p className="text-body-small text-muted-foreground">{s.desc}</p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="section-pad-sm" aria-labelledby="trust-title">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="text-overline mb-3 block">Sécurité & confiance</span>
          <h2 id="trust-title" className="text-display-sm mb-3">On a tout pensé pour que tu dormes tranquille.</h2>
          <p className="text-body-lg text-muted-foreground">4 garanties concrètes, pas du marketing.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {TRUST_PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.article key={p.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: i * 0.06 }} className="card-future hover-lift">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-primary" aria-hidden="true" /></div>
                <h3 className="text-title-sm mb-2">{p.title}</h3>
                <p className="text-body-small text-muted-foreground">{p.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComparatorSection() {
  return (
    <section className="section-pad-sm" aria-labelledby="comparator-title">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-10">
          <span className="text-overline mb-3 block">Le match</span>
          <h2 id="comparator-title" className="text-display-sm mb-3">Nidit vs la poste classique</h2>
          <p className="text-body-lg text-muted-foreground">Pour un colis 2 kg Paris → Marseille.</p>
        </div>
        <div className="card-future overflow-hidden p-0">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-5 py-4 bg-gradient-soft border-b border-border/60">
            <span className="text-overline">Critère</span>
            <span className="text-overline text-[hsl(220_90%_30%)] dark:text-[hsl(218_100%_75%)] font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" aria-hidden="true" />Nidit</span>
            <span className="text-overline text-muted-foreground">Poste classique</span>
          </div>
          <ul className="divide-y divide-border/40">
            {COMPARISON_ROWS.map((r) => (
              <li key={r.label} className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-5 py-4 items-center">
                <span className="text-body-small font-medium">{r.label}</span>
                <span className="text-body-base font-bold text-[hsl(220_90%_30%)] dark:text-[hsl(218_100%_75%)] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />{r.nidit}</span>
                <span className="text-body-small text-muted-foreground">{r.poste}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function NeedItSpotlight() {
  return (
    <section className="section-pad-sm" aria-labelledby="needit-title">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="card-future-glow grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center p-8 sm:p-12">
          <div>
            <span className="chip-info mb-4"><Globe className="w-3.5 h-3.5" aria-hidden="true" />Exclu Nidit</span>
            <h2 id="needit-title" className="text-display-sm mb-4">NeedIt — Le shopping international par un humain.</h2>
            <p className="text-body-lg text-muted-foreground mb-6">Tu cherches un produit introuvable chez toi ? Demande à un voyageur de l'acheter sur place. Il l'embarque dans sa valise. Tu paies le prix du produit + un service. Aussi simple que ça.</p>
            <ul className="space-y-3 mb-8">
              {["Cosmétiques pharmacie française quand tu vis à Dubaï", "Spécialités du pays quand tu es expat", "Produits introuvables sur Amazon", "Cadeaux livrés en main propre"].map((x) => (
                <li key={x} className="flex items-start gap-3 text-body-base"><CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden="true" /><span>{x}</span></li>
              ))}
            </ul>
            <Link to="/signup?intent=needit" className="btn-cta-primary">Lancer une mission NeedIt<ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
          </div>
          <div className="relative">
            <div className="surface-card p-6 max-w-md ml-auto">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://i.pravatar.cc/64?img=44" alt="" width={48} height={48} className="w-12 h-12 rounded-full" loading="lazy" aria-hidden="true" />
                <div>
                  <div className="font-bold text-body-base">Sandra · Bordeaux → Paris</div>
                  <div className="text-caption-base flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />Demain · 16 articles dispo</div>
                </div>
              </div>
              <div className="rounded-2xl bg-muted p-4 mb-4">
                <div className="font-bold text-body-base mb-1">Crème Embryolisse 75 ml</div>
                <div className="text-caption-base text-muted-foreground mb-3">Pharmacie · introuvable à Dubaï</div>
                <div className="flex items-center justify-between"><span className="text-title-sm font-bold">19 €</span><span className="chip-success">+ 6 € service</span></div>
              </div>
              <button type="button" className="btn-cta-primary w-full text-sm h-11"><MessageCircle className="w-4 h-4" aria-hidden="true" />Demander à Sandra</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="section-pad-sm" aria-labelledby="testimonials-title">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-10">
          <span className="text-overline mb-3 block">Ils l'utilisent</span>
          <h2 id="testimonials-title" className="text-display-sm">Et ils en parlent mieux que nous.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: i * 0.08 }} className="card-future hover-lift">
              <div className="flex items-center gap-1 mb-4" role="img" aria-label={`Note ${t.rating} sur 5`}>{Array.from({ length: t.rating }).map((_, idx) => (<Star key={idx} className="w-4 h-4 fill-warning text-warning" aria-hidden="true" />))}</div>
              <blockquote className="text-body-base mb-5">« {t.quote} »</blockquote>
              <figcaption className="flex items-center gap-3 pt-4 border-t border-border/40">
                <img src={t.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded-full" loading="lazy" aria-hidden="true" />
                <div><div className="font-bold text-body-small">{t.name}</div><div className="text-caption-base">{t.role}</div></div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  const id = `faq-panel-${idx}`;
  return (
    <li className="border-b border-border/60 last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={id} className="w-full flex items-center justify-between gap-4 py-5 text-left focus-ring">
        <span className="text-title-sm font-bold">{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180 text-primary" : ""}`} aria-hidden="true" />
      </button>
      <div id={id} role="region" hidden={!open} className="pb-5 text-body-base text-muted-foreground">{a}</div>
    </li>
  );
}

function FAQSection() {
  return (
    <section className="section-pad-sm" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-10">
          <span className="text-overline mb-3 block">FAQ</span>
          <h2 id="faq-title" className="text-display-sm">Les questions qu'on nous pose toujours.</h2>
        </div>
        <ul className="card-future p-0 px-5 sm:px-7">{FAQ_ITEMS.map((f, i) => (<FAQItem key={f.q} q={f.q} a={f.a} idx={i} />))}</ul>
        <p className="text-center text-body-small text-muted-foreground mt-6">Une autre question ? <Link to="/aide" className="link-fancy">Centre d'aide</Link></p>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="section-pad" aria-labelledby="final-cta-title">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] p-10 sm:p-16 text-center" style={{ background: "var(--gradient-hero-bright)" }}>
          <div className="absolute -top-32 -right-20 w-80 h-80 rounded-full opacity-50 blur-3xl pointer-events-none" style={{ background: "hsl(var(--secondary) / 0.5)" }} aria-hidden="true" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-50 blur-3xl pointer-events-none" style={{ background: "hsl(var(--primary) / 0.5)" }} aria-hidden="true" />
          <div className="relative">
            <span className="chip-info mb-5"><Wallet className="w-3.5 h-3.5" aria-hidden="true" />Inscription gratuite — sans CB</span>
            <h2 id="final-cta-title" className="text-display mb-5">Le prochain colis, c'est avec Nidit.</h2>
            <p className="text-body-lg text-muted-foreground max-w-xl mx-auto mb-8">Rejoins une communauté qui transforme chaque trajet en service rendu. C'est plus humain, c'est plus malin.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup?role=sender" className="btn-cta-primary"><Package className="w-5 h-5" aria-hidden="true" />Envoyer un colis</Link>
              <Link to="/signup?role=traveler" className="btn-cta-secondary"><Plane className="w-5 h-5" aria-hidden="true" />Devenir voyageur</Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-caption-base text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" aria-hidden="true" />Identité vérifiée</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-success" aria-hidden="true" />Paiement bloqué</span>
              <span className="flex items-center gap-1.5"><Camera className="w-4 h-4 text-success" aria-hidden="true" />Preuves photo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border/60 py-10 mt-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-body-small">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center"><Package className="w-4 h-4 text-primary-foreground" aria-hidden="true" /></div>
            <span className="font-extrabold text-title-sm">Nidit</span>
          </div>
          <p className="text-muted-foreground">La poste collaborative qui marche.</p>
        </div>
        <div>
          <h3 className="text-overline mb-3">Produit</h3>
          <ul className="space-y-2 text-muted-foreground"><li><Link to="/explore" className="hover:text-primary">Trajets</Link></li><li><Link to="/comment-ca-marche" className="hover:text-primary">Comment ça marche</Link></li><li><Link to="/blog" className="hover:text-primary">Blog</Link></li></ul>
        </div>
        <div>
          <h3 className="text-overline mb-3">Entreprise</h3>
          <ul className="space-y-2 text-muted-foreground"><li><Link to="/aide" className="hover:text-primary">Centre d'aide</Link></li><li><Link to="/support-contact" className="hover:text-primary">Contact</Link></li><li><Link to="/terms" className="hover:text-primary">CGU</Link></li><li><Link to="/confidentialite" className="hover:text-primary">Confidentialité</Link></li></ul>
        </div>
        <div>
          <h3 className="text-overline mb-3">App</h3>
          <ul className="space-y-2 text-muted-foreground"><li><Link to="/install" className="hover:text-primary">Installer la PWA</Link></li><li className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" aria-hidden="true" />Support 7j/7</li></ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption-base text-muted-foreground">
        <span>© {new Date().getFullYear()} Nidit. Tous droits réservés.</span>
        <span>Fait avec ♡ pour la communauté.</span>
      </div>
    </footer>
  );
}

export default function PublicLanding() {
  return (
    <>
      <Helmet>
        <title>Nidit — Vos colis voyagent avec des humains</title>
        <meta name="description" content="Envoyez vos colis avec des voyageurs vérifiés, partout dans le monde. 2× plus rapide, jusqu'à 50 % moins cher que la poste, 100 % humain." />
        <link rel="canonical" href="https://nidit.fr/decouvrir" />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "Nidit", description: "Plateforme C2C de transport collaboratif de colis et missions d'achat international.", provider: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" }, areaServed: { "@type": "Country", name: "Worldwide" }, offers: { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: "5", highPrice: "150" }, aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "12400" } })}</script>
      </Helmet>
      <a href="#main" className="sr-skip-link">Aller au contenu principal</a>
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main id="main">
          <HeroSection />
          <StatsMarquee />
          <HowItWorksSection />
          <TrustSection />
          <ComparatorSection />
          <NeedItSpotlight />
          <TestimonialsSection />
          <FAQSection />
          <FinalCTASection />
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
