import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Plane, Package2, MapPin, FileText, Search, ShieldCheck, Truck, KeyRound, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import Seo from "@/components/Seo";
import { useTranslation } from "@/hooks/useTranslation";
import { buildTransportFaq, detectTransport } from "@/lib/transportFaq";

interface PublicVoyageDetail {
  id: string;
  ref_number: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  arrival_date: string | null;
  transport_method: string;
  max_weight_kg: number | null;
  capacity_dimensions: string | null;
  accept_needit: boolean;
}

export default function PublicVoyageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [v, setV] = useState<PublicVoyageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.rpc("get_public_voyage", { _id: id }).then(({ data }) => {
      const row = (data as any)?.[0];
      if (row) {
        setV(row);
        document.title = `${row.departure_city} → ${row.arrival_city} | Nidit`;
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !v) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">{t("publicVoyage.notFound")}</h1>
        <p className="mt-2 text-muted-foreground">{t("publicVoyage.notFoundDesc")}</p>
        <Button onClick={() => navigate("/explore")} className="mt-4">
          {t("publicVoyage.seeAvailable")}
        </Button>
      </div>
    );
  }

  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;

  const dateLong = new Date(v.departure_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const seoTitle = `Envoyer un colis ${v.departure_city} → ${v.arrival_city} le ${dateLong} | Nidit`;
  const seoDesc = `Trajet ${v.transport_method} de ${v.departure_city} (${v.departure_country}) vers ${v.arrival_city} (${v.arrival_country}) le ${dateLong}. Envoie ton colis avec un voyageur Nidit vérifié, paiement protégé jusqu'à la livraison.`;
  const canonical = `/trajet/${v.id}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TravelAction",
      name: `${v.departure_city} → ${v.arrival_city}`,
      fromLocation: { "@type": "City", name: v.departure_city, address: { "@type": "PostalAddress", addressCountry: v.departure_country } },
      toLocation: { "@type": "City", name: v.arrival_city, address: { "@type": "PostalAddress", addressCountry: v.arrival_country } },
      startTime: v.departure_date,
      endTime: v.arrival_date || undefined,
      provider: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" },
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Transport de colis entre particuliers",
      name: `Envoi de colis ${v.departure_city} → ${v.arrival_city}`,
      description: seoDesc,
      areaServed: [
        { "@type": "City", name: v.departure_city },
        { "@type": "City", name: v.arrival_city },
      ],
      provider: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" },
      offers: { "@type": "Offer", availability: "https://schema.org/InStock", priceCurrency: "EUR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://nidit.fr/" },
        { "@type": "ListItem", position: 2, name: "Trajets", item: "https://nidit.fr/explore" },
        { "@type": "ListItem", position: 3, name: `${v.departure_city} → ${v.arrival_city}`, item: `https://nidit.fr${canonical}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Comment envoyer un colis de ${v.departure_city} à ${v.arrival_city} ?`,
          acceptedAnswer: { "@type": "Answer", text: `Crée ton compte Nidit, publie ton colis ${v.departure_city} → ${v.arrival_city}, choisis un voyageur vérifié et règle en paiement protégé. Le voyageur récupère ton colis et le remet à destination contre code OTP.` },
        },
        {
          "@type": "Question",
          name: `Quel est le prix d'envoi ${v.departure_city} → ${v.arrival_city} ?`,
          acceptedAnswer: { "@type": "Answer", text: `Le tarif est fixé librement entre membre et voyageur Nidit. Il dépend du poids, du volume et de la nature du colis. Souvent moins cher que la poste classique.` },
        },
        {
          "@type": "Question",
          name: "Mon colis est-il assuré ?",
          acceptedAnswer: { "@type": "Answer", text: "Le paiement est bloqué (escrow) jusqu'à la confirmation de livraison via OTP et photo. En cas de litige, l'équipe Nidit intervient sous 72 h." },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={seoTitle} description={seoDesc} canonical={canonical} jsonLd={jsonLd} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-sm font-semibold text-muted-foreground">{v.ref_number}</div>
          <ShareButton
            url={`/trajet/${v.id}`}
            title={`${v.departure_city} → ${v.arrival_city}`}
            text={`Trajet ${v.transport_method} disponible sur Nidit`}
            ogType="voyage"
            ogId={v.id}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Plane className="h-3 w-3" />
            {v.transport_method}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight">
            Envoyer un colis <span className="text-primary">{v.departure_city} → {v.arrival_city}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {v.departure_country} → {v.arrival_country} · départ le {dateLong}
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Trajet <strong>{v.transport_method}</strong> publié par un voyageur Nidit vérifié. Confie ton colis,
            ta lettre, un produit cosmétique ou un cadeau à transporter de <strong>{v.departure_city}</strong> vers{" "}
            <strong>{v.arrival_city}</strong>. Paiement protégé jusqu'à la livraison, code OTP à la remise et à la
            réception, suivi en temps réel.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">{t("publicVoyage.departure")}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(v.departure_date).toLocaleDateString(localeTag, {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>
            {v.arrival_date && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <MapPin className="h-5 w-5 text-success" />
                <div>
                  <div className="text-sm font-semibold">{t("publicVoyage.arrival")}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(v.arrival_date).toLocaleDateString(localeTag, {
                      weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )}
            {(v.max_weight_kg || v.capacity_dimensions) && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <Package2 className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">{t("publicVoyage.capacity")}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.max_weight_kg ? t("publicVoyage.kgMax", { kg: v.max_weight_kg }) : ""}
                    {v.max_weight_kg && v.capacity_dimensions ? " • " : ""}
                    {v.capacity_dimensions || ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold">{t("publicVoyage.interestedTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("publicVoyage.interestedDesc")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/signup")}>{t("publicCommon.createAccount")}</Button>
            <Button variant="outline" onClick={() => navigate("/login")}>{t("publicCommon.signIn")}</Button>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Comment ça marche pour ton envoi {v.departure_city} → {v.arrival_city} ?</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><strong className="text-foreground">1. Crée ton compte</strong> et publie ton colis en 2 minutes.</li>
            <li><strong className="text-foreground">2. Choisis ce voyageur</strong> ({v.transport_method}) ou un autre voyageur Nidit sur la même route.</li>
            <li><strong className="text-foreground">3. Paiement protégé</strong> : ton argent est bloqué tant que la livraison n'est pas confirmée.</li>
            <li><strong className="text-foreground">4. Remise &amp; livraison</strong> contre code OTP + photo, puis paiement libéré au voyageur.</li>
          </ol>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Questions fréquentes</h2>
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">Combien coûte un envoi {v.departure_city} → {v.arrival_city} ?</h3>
              <p className="mt-1 text-muted-foreground">Le tarif est fixé librement entre toi et le voyageur, selon poids, volume et nature du colis. Souvent moins cher qu'un envoi postal classique.</p>
            </div>
            <div>
              <h3 className="font-semibold">Mon colis est-il protégé ?</h3>
              <p className="mt-1 text-muted-foreground">Oui : paiement bloqué (escrow) jusqu'à confirmation de livraison, voyageurs vérifiés (KYC), litiges traités sous 72 h.</p>
            </div>
            <div>
              <h3 className="font-semibold">Quels objets puis-je envoyer ?</h3>
              <p className="mt-1 text-muted-foreground">La majorité des objets du quotidien : documents, vêtements, cosmétiques, électronique légère, cadeaux. Produits dangereux et substances interdites exclus.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link to="/explore" className="text-sm text-muted-foreground hover:underline">
            ← {t("publicVoyage.seeAllTrips")}
          </Link>
        </div>
      </div>
    </div>
  );
}
