import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { useTranslation } from "@/hooks/useTranslation";

interface PublicShipment {
  id: string;
  ref_number: string;
  departure_city: string | null;
  arrival_city: string;
  arrival_country: string;
  size: string;
  tarif: string;
  departure_date: string | null;
  photo_url: string | null;
}

export default function PublicShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [s, setS] = useState<PublicShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.rpc("get_public_shipment", { _id: id }).then(({ data }) => {
      const row = (data as any)?.[0];
      if (row) {
        setS(row);
        document.title = `Colis ${row.departure_city || "—"} → ${row.arrival_city} | Nidit`;
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

  if (notFound || !s) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">{t("publicShipment.notFound")}</h1>
        <Button onClick={() => navigate("/explore")} className="mt-4">{t("publicMission.exploreNidit")}</Button>
      </div>
    );
  }

  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-sm font-semibold text-muted-foreground">{s.ref_number}</div>
          <ShareButton
            url={`/colis/${s.id}`}
            title={`Colis ${s.departure_city || "—"} → ${s.arrival_city}`}
            text={`Colis taille ${s.size} à transporter sur Nidit`}
            ogType="colis"
            ogId={s.id}
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          {s.photo_url && (
            <img src={s.photo_url} alt="Colis" loading="lazy" className="h-64 w-full object-cover" />
          )}
          <div className="p-6">
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Package className="h-3 w-3" /> {t("publicShipment.parcelSize", { size: s.size })}
            </div>
            <h1 className="text-3xl font-extrabold">
              {s.departure_city || "—"} → {s.arrival_city}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {s.arrival_country}
            </div>
            <div className="mt-4 text-lg font-semibold">
              {t("publicShipment.proposedRate")} <span className="text-success">{s.tarif}</span>
            </div>
            {s.departure_date && (
              <div className="mt-2 text-sm text-muted-foreground">
                {t("publicShipment.availableFrom")}{" "}
                {new Date(s.departure_date).toLocaleDateString(localeTag, {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold">{t("publicShipment.goingTo", { country: s.arrival_country })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("publicShipment.signupCta", { tarif: s.tarif })}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/signup")}>{t("publicCommon.createAccount")}</Button>
            <Button variant="outline" onClick={() => navigate("/login")}>{t("publicCommon.signIn")}</Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/explore" className="text-sm text-muted-foreground hover:underline">
            ← {t("publicShipment.seeOtherTrips")}
          </Link>
        </div>
      </div>
    </div>
  );
}
