/**
 * PublicCityRoute — page programmatique SEO ville-à-ville.
 *
 * URL : /colis/:slug   où :slug = "paris-marseille", "lyon-casablanca", etc.
 *
 * À brancher dans App.tsx :
 *   const PublicCityRoute = lazy(() => import("./features/core/pages/PublicCityRoute"));
 *   <Route path="/colis/:slug" element={<PublicCityRoute />} />
 *
 * Pourquoi : Google adore les pages ciblant des intentions précises type
 * "envoyer colis [ville A] [ville B]". Avec 100 paires de villes prioritaires,
 * tu gagnes 100 portes d'entrée SEO en quelques heures.
 */

import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Package, Plane, MapPin, ArrowRight, Clock, Wallet,
  ShieldCheck, Lock, KeyRound, Heart, CheckCircle2, Sparkles,
} from "lucide-react";
import {
  makeRouteJsonLd, makeBreadcrumbJsonLd, makeFAQJsonLd,
  type CityRoute,
} from "@/lib/seo";

/**
 * Catalogue des routes prioritaires (FR-FR + diaspora).
 * Étendre avec les paires les plus searchées dans Google Search Console.
 * Format : <slug>: { from, to, fromCountry, toCountry, averagePriceEUR, averageDurationHours }
 */
const ROUTE_CATALOG: Record<string, CityRoute & { popular?: boolean }> = {
  "paris-marseille":   { from: "Paris",   to: "Marseille",   fromCountry: "France",  toCountry: "France",  averagePriceEUR: 9,  averageDurationHours: 36, popular: true },
  "paris-lyon":        { from: "Paris",   to: "Lyon",        fromCountry: "France",  toCountry: "France",  averagePriceEUR: 8,  averageDurationHours: 24, popular: true },
  "paris-bordeaux":    { from: "Paris",   to: "Bordeaux",    fromCountry: "France",  toCountry: "France",  averagePriceEUR: 9,  averageDurationHours: 28 },
  "paris-toulouse":    { from: "Paris",   to: "Toulouse",    fromCountry: "France",  toCountry: "France",  averagePriceEUR: 10, averageDurationHours: 30 },
  "paris-nice":        { from: "Paris",   to: "Nice",        fromCountry: "France",  toCountry: "France",  averagePriceEUR: 11, averageDurationHours: 36 },
  "paris-lille":       { from: "Paris",   to: "Lille",       fromCountry: "France",  toCountry: "France",  averagePriceEUR: 7,  averageDurationHours: 18 },
  "paris-strasbourg":  { from: "Paris",   to: "Strasbourg",  fromCountry: "France",  toCountry: "France",  averagePriceEUR: 9,  averageDurationHours: 24 },
  "paris-rennes":      { from: "Paris",   to: "Rennes",      fromCountry: "France",  toCountry: "France",  averagePriceEUR: 8,  averageDurationHours: 22 },
  "paris-nantes":      { from: "Paris",   to: "Nantes",      fromCountry: "France",  toCountry: "France",  averagePriceEUR: 8,  averageDurationHours: 22 },
  "paris-casablanca":  { from: "Paris",   to: "Casablanca",  fromCountry: "France",  toCountry: "Maroc",   averagePriceEUR: 24, averageDurationHours: 48, popular: true },
  "paris-alger":       { from: "Paris",   to: "Alger",       fromCountry: "France",  toCountry: "Algérie", averagePriceEUR: 22, averageDurationHours: 48 },
  "paris-tunis":       { from: "Paris",   to: "Tunis",       fromCountry: "France",  toCountry: "Tunisie", averagePriceEUR: 22, averageDurationHours: 48 },
  "paris-dakar":       { from: "Paris",   to: "Dakar",       fromCountry: "France",  toCountry: "Sénégal", averagePriceEUR: 35, averageDurationHours: 60 },
  "paris-londres":     { from: "Paris",   to: "Londres",     fromCountry: "France",  toCountry: "UK",      averagePriceEUR: 18, averageDurationHours: 24 },
  "paris-dubai":       { from: "Paris",   to: "Dubaï",       fromCountry: "France",  toCountry: "UAE",     averagePriceEUR: 45, averageDurationHours: 60 },
  "paris-montreal":    { from: "Paris",   to: "Montréal",    fromCountry: "France",  toCountry: "Canada",  averagePriceEUR: 55, averageDurationHours: 72 },
  "lyon-casablanca":   { from: "Lyon",    to: "Casablanca",  fromCountry: "France",  toCountry: "Maroc",   averagePriceEUR: 24, averageDurationHours: 48 },
  "lyon-marseille":    { from: "Lyon",    to: "Marseille",   fromCountry: "France",  toCountry: "France",  averagePriceEUR: 7,  averageDurationHours: 18 },
  "marseille-alger":   { from: "Marseille", to: "Alger",     fromCountry: "France",  toCountry: "Algérie", averagePriceEUR: 22, averageDurationHours: 36 },
  "marseille-tunis":   { from: "Marseille", to: "Tunis",     fromCountry: "France",  toCountry: "Tunisie", averagePriceEUR: 22, averageDurationHours: 36 },
  "bruxelles-paris":   { from: "Bruxelles", to: "Paris",     fromCountry: "Belgique",toCountry: "France",  averagePriceEUR: 10, averageDurationHours: 12 },
  "geneve-paris":      { from: "Genève",  to: "Paris",       fromCountry: "Suisse",  toCountry: "France",  averagePriceEUR: 12, averageDurationHours: 14 },
};

/** Liste des slugs valides — utilisable pour générer le sitemap. */
export const PUBLIC_CITY_ROUTES = Object.keys(ROUTE_CATALOG);

function StatPill({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="card-future flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
      </div>
      <div>
        <div className="text-overline">{label}</div>
        <div className="text-title-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

export default function PublicCityRoute() {
  const { slug } = useParams<{ slug: string }>();
  const route = slug ? ROUTE_CATALOG[slug.toLowerCase()] : null;

  // Slug invalide → redirige vers /explore (404 propre côté SEO via le router)
  if (!route) return <Navigate to="/explore" replace />;

  const title = `Envoyer un colis ${route.from} → ${route.to}`;
  const description = `Envoyez vos colis de ${route.from} à ${route.to} via un voyageur Nidit vérifié. À partir de ${route.averagePriceEUR} €, livré en ${route.averageDurationHours} h en moyenne. Plus humain, plus rapide, jusqu'à 50 % moins cher que la poste.`;
  const canonical = `https://nidit.fr/colis/${slug}`;

  const faqItems = useMemo(() => ([
    {
      question: `Combien coûte un envoi ${route.from} → ${route.to} ?`,
      answer: `En moyenne ${route.averagePriceEUR} € pour un colis de 2 kg. Le prix est négocié librement entre toi et le voyageur. C'est 30 à 50 % moins cher que la poste classique.`,
    },
    {
      question: `En combien de temps mon colis arrive ${route.from} → ${route.to} ?`,
      answer: `Délai moyen : ${route.averageDurationHours} h. Ton colis voyage avec un humain qui fait ce trajet — il arrive donc avec lui, beaucoup plus vite qu'en circuit postal classique.`,
    },
    {
      question: "Mon colis est-il assuré ?",
      answer: "Oui — chaque colis est couvert jusqu'à 500 € contre la perte, le vol et la casse. Le paiement est bloqué jusqu'à la livraison confirmée par un code unique.",
    },
    {
      question: "Comment vérifier la fiabilité du voyageur ?",
      answer: "Tous les voyageurs Nidit sont KYC (carte d'identité + selfie). Tu vois sa note moyenne, ses avis, son historique de livraisons avant d'accepter.",
    },
  ]), [route.from, route.to, route.averagePriceEUR, route.averageDurationHours]);

  const breadcrumbs = [
    { name: "Accueil", url: "/" },
    { name: "Trajets", url: "/explore" },
    { name: `${route.from} → ${route.to}`, url: `/colis/${slug}` },
  ];

  return (
    <>
      <Helmet>
        <title>{title} — Nidit</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(makeRouteJsonLd(route))}</script>
        <script type="application/ld+json">{JSON.stringify(makeBreadcrumbJsonLd(breadcrumbs))}</script>
        <script type="application/ld+json">{JSON.stringify(makeFAQJsonLd(faqItems))}</script>
      </Helmet>

      <a href="#main" className="sr-skip-link">Aller au contenu principal</a>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden page-header-bright">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-12">
            <nav aria-label="Fil d'Ariane" className="text-caption-base mb-5">
              <Link to="/" className="hover:text-primary">Accueil</Link>
              <span className="mx-2 text-muted-foreground">/</span>
              <Link to="/explore" className="hover:text-primary">Trajets</Link>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-foreground font-semibold">{route.from} → {route.to}</span>
            </nav>
            <span className="chip-info mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {route.popular ? "Trajet populaire" : "Trajet disponible"}
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-display mb-4"
            >
              {title}
            </motion.h1>
            <p className="text-body-lg text-muted-foreground max-w-2xl mb-8">{description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/signup?role=sender&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`} className="btn-cta-primary">
                <Package className="w-5 h-5" aria-hidden="true" />
                Envoyer un colis
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link to={`/signup?role=traveler&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`} className="btn-cta-secondary">
                <Plane className="w-5 h-5" aria-hidden="true" />
                Devenir voyageur sur ce trajet
              </Link>
            </div>
          </div>
        </section>

        <main id="main" className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <StatPill icon={Wallet} label="Prix moyen 2 kg" value={`${route.averagePriceEUR} €`} />
            <StatPill icon={Clock} label="Délai moyen" value={`${route.averageDurationHours} h`} />
            <StatPill icon={MapPin} label="Destination" value={`${route.toCountry ?? ""}`} />
          </div>

          {/* Garanties (rappel) */}
          <section className="card-future-glow mb-12 p-8">
            <h2 className="text-title-lg font-bold mb-6">Tes garanties Nidit sur ce trajet</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: ShieldCheck, t: "Voyageur vérifié", d: "KYC complet : identité + selfie. Pas d'anonymat." },
                { icon: Lock,        t: "Paiement bloqué",  d: "Stripe séquestre — débloqué uniquement à la livraison." },
                { icon: KeyRound,    t: "Code de remise",   d: "Un code unique remis par le destinataire. Sans code, pas de paiement." },
                { icon: Heart,       t: "Assurance 500 €",  d: "Couverture perte / vol / casse incluse sur tous les colis." },
              ].map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.t} className="flex gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 shrink-0 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-bold text-body-base mb-1">{g.t}</div>
                      <div className="text-body-small text-muted-foreground">{g.d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* FAQ contextualisée */}
          <section className="card-future" aria-labelledby="city-faq-title">
            <h2 id="city-faq-title" className="text-title-lg font-bold mb-6">Questions sur le trajet {route.from} → {route.to}</h2>
            <ul className="divide-y divide-border/50">
              {faqItems.map((f) => (
                <li key={f.question} className="py-5">
                  <h3 className="text-title-sm font-bold mb-2">{f.question}</h3>
                  <p className="text-body-base text-muted-foreground">{f.answer}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Cross-link autres trajets */}
          <section className="mt-12">
            <h2 className="text-title font-bold mb-5">Autres trajets populaires</h2>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_CITY_ROUTES.filter((s) => s !== slug).slice(0, 12).map((s) => {
                const r = ROUTE_CATALOG[s];
                return (
                  <Link key={s} to={`/colis/${s}`} className="chip-info hover:bg-primary/20 transition-colors">
                    {r.from} → {r.to}
                    {r.popular ? <Sparkles className="w-3 h-3" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* CTA bas de page */}
          <div className="mt-16 text-center">
            <h2 className="text-display-sm mb-3">Prêt à expédier {route.from} → {route.to} ?</h2>
            <p className="text-body-lg text-muted-foreground mb-6">À partir de {route.averagePriceEUR} €, livré en {route.averageDurationHours} h.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/signup?role=sender&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`} className="btn-cta-primary">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                Lancer mon envoi
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
