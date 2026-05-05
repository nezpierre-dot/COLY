import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Plane, Calendar, Package2, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { parseRouteSlug } from "@/lib/popularRoutes";

interface RouteVoyage {
  id: string;
  ref_number: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  transport_method: string;
}

// Slug format: "paris_dakar" (slugified, "_" separates from/to).
function parseSlug(slug: string) {
  return parseRouteSlug(slug);
}

export default function PublicRoutePage() {
  const { slug } = useParams<{ slug: string }>();
  const route = useMemo(() => (slug ? parseSlug(slug) : null), [slug]);
  const [voyages, setVoyages] = useState<RouteVoyage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!route) {
      setLoading(false);
      return;
    }
    supabase
      .rpc("get_public_voyages_by_route", { _from: route.from, _to: route.to, _limit: 50 })
      .then(({ data }) => {
        setVoyages((data as any) || []);
        setLoading(false);
      });
  }, [route]);

  if (!route) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <p className="text-muted-foreground">Route invalide.</p>
      </div>
    );
  }

  const title = `Envoyer un colis ${route.from} → ${route.to} avec un voyageur | Nidit`;
  const description = `Trouve un voyageur Nidit vérifié sur la route ${route.from} → ${route.to}. Livraison rapide, paiement protégé, souvent moins cher que la poste.`;
  const canonical = `/explore/${slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://nidit.fr/" },
        { "@type": "ListItem", position: 2, name: "Trajets", item: "https://nidit.fr/explore" },
        { "@type": "ListItem", position: 3, name: `${route.from} → ${route.to}`, item: `https://nidit.fr${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `Envoi de colis ${route.from} → ${route.to}`,
      provider: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" },
      areaServed: [route.from, route.to],
      description,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={title} description={description} canonical={canonical} jsonLd={jsonLd} />

      <header className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground">
            ← Tous les trajets
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
            Envoie ton colis <span className="text-primary">{route.from} → {route.to}</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Connecte-toi avec un voyageur Nidit qui part bientôt entre <strong>{route.from}</strong> et{" "}
            <strong>{route.to}</strong>. Plus rapide, plus humain, paiement protégé jusqu'à la livraison.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/send-choice">
                Envoyer un colis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/new-trip">Je voyage sur cette route</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="mb-4 text-xl font-bold">Voyageurs disponibles {route.from} → {route.to}</h2>

        {loading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : voyages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <Package2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Aucun voyageur publié pour le moment</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publie ton colis maintenant : tu seras notifié dès qu'un voyageur publie cette route.
            </p>
            <Button asChild className="mt-4">
              <Link to="/send-choice">Publier mon colis</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {voyages.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/trajet/${v.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Plane className="h-4 w-4" />
                      {v.transport_method}
                    </div>
                    <span className="text-xs text-muted-foreground">{v.ref_number}</span>
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {v.departure_city} → {v.arrival_city}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(v.departure_date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h2 className="text-xl font-bold">Pourquoi envoyer {route.from} → {route.to} avec Nidit ?</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span><strong>Paiement protégé</strong> : ton argent est bloqué jusqu'à la confirmation de livraison.</span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span><strong>Voyageurs vérifiés</strong> : identité contrôlée (KYC) avant tout transport.</span>
            </li>
            <li className="flex gap-3">
              <Package2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span><strong>Suivi en temps réel</strong> et preuves photo à la remise et à la livraison.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
