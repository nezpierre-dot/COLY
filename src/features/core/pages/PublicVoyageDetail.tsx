import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Plane, Package2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import Seo from "@/components/Seo";
import { useTranslation } from "@/hooks/useTranslation";

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

  const seoTitle = `${v.departure_city} → ${v.arrival_city} le ${new Date(v.departure_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} | Nidit`;
  const seoDesc = `Trajet ${v.transport_method} de ${v.departure_city} (${v.departure_country}) vers ${v.arrival_city} (${v.arrival_country}). Envoyez votre colis avec un voyageur Nidit vérifié.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: `${v.departure_city} → ${v.arrival_city}`,
    fromLocation: { "@type": "City", name: v.departure_city, address: { "@type": "PostalAddress", addressCountry: v.departure_country } },
    toLocation: { "@type": "City", name: v.arrival_city, address: { "@type": "PostalAddress", addressCountry: v.arrival_country } },
    startTime: v.departure_date,
    endTime: v.arrival_date || undefined,
    provider: { "@type": "Organization", name: "Nidit", url: "https://nidit.fr" },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={seoTitle} description={seoDesc} canonical={`/trajet/${v.id}`} jsonLd={jsonLd} />
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
          <h1 className="text-3xl font-extrabold">
            {v.departure_city} → {v.arrival_city}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {v.departure_country} → {v.arrival_country}
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

        <div className="mt-6 text-center">
          <Link to="/explore" className="text-sm text-muted-foreground hover:underline">
            ← {t("publicVoyage.seeAllTrips")}
          </Link>
        </div>
      </div>
    </div>
  );
}
