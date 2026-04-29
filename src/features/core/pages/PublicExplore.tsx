import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";

interface PublicVoyage {
  id: string;
  ref_number: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  transport_method: string;
  max_weight_kg: number | null;
}

export default function PublicExplore() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [voyages, setVoyages] = useState<PublicVoyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState(searchParams.get("to") || "");

  useEffect(() => {
    document.title = `${t("publicExplore.metaTitle")} | Nidit`;
    const c = searchParams.get("to") || "";
    setCountry(c);
    setLoading(true);
    supabase
      .rpc("get_public_voyages", { _limit: 80, _country: c || null })
      .then(({ data }) => {
        setVoyages((data as any) || []);
        setLoading(false);
      });
  }, [searchParams, t]);

  const applyFilter = () => {
    if (country) setSearchParams({ to: country });
    else setSearchParams({});
  };

  const localeTag = language === "ar" ? "ar" : `${language}-${language.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-lg font-bold">{t("publicExplore.title")}</h1>
          <Button size="sm" onClick={() => navigate("/signup")}>
            {t("publicCommon.signUp")}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <Input
            placeholder={t("publicExplore.countryPlaceholder")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter()}
          />
          <Button onClick={applyFilter} variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            {t("publicExplore.filter")}
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : voyages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">{t("publicExplore.noTrips")}</p>
            <Button onClick={() => setSearchParams({})} variant="outline" className="mt-4">
              {t("publicExplore.showAll")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {voyages.map((v) => (
              <Link
                key={v.id}
                to={`/trajet/${v.id}`}
                className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground">{v.ref_number}</div>
                  <div className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {v.transport_method}
                  </div>
                </div>
                <div className="mt-2 text-base font-semibold">
                  {v.departure_city} <span className="text-muted-foreground">({v.departure_country})</span>
                </div>
                <div className="mt-1 text-base font-semibold">
                  → {v.arrival_city} <span className="text-muted-foreground">({v.arrival_country})</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {new Date(v.departure_date).toLocaleDateString(localeTag, {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {v.max_weight_kg && (
                    <span className="font-semibold text-success">{t("publicVoyage.kgMax", { kg: v.max_weight_kg })}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="font-semibold">{t("publicExplore.ctaTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("publicExplore.ctaDesc")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => navigate("/signup")}>{t("publicCommon.signUp")}</Button>
            <Button variant="outline" onClick={() => navigate("/login")}>{t("publicCommon.signIn")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
