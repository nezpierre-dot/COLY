import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";

interface PublicMission {
  id: string;
  ref_number: string;
  product_name: string;
  country: string;
  city: string | null;
  prix_max: string | null;
  photo_url: string | null;
  category_path: string[] | null;
}

export default function PublicMissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [m, setM] = useState<PublicMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.rpc("get_public_mission", { _id: id }).then(({ data }) => {
      const row = (data as any)?.[0];
      if (row) {
        setM(row);
        document.title = `${row.product_name} | NeedIt Nidit`;
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

  if (notFound || !m) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">Mission introuvable</h1>
        <Button onClick={() => navigate("/explore")} className="mt-4">Explorer Nidit</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-sm font-semibold text-muted-foreground">{m.ref_number}</div>
          <ShareButton url={`/needit/${m.id}`} title={m.product_name} text={`NeedIt: ${m.product_name}`} ogType="mission" ogId={m.id} />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          {m.photo_url && (
            <img
              src={m.photo_url}
              alt={m.product_name}
              loading="lazy"
              className="h-64 w-full object-cover"
            />
          )}
          <div className="p-6">
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Tag className="h-3 w-3" /> NeedIt
            </div>
            <h1 className="text-3xl font-extrabold">{m.product_name}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {m.city ? `${m.city}, ${m.country}` : m.country}
            </div>
            {m.prix_max && (
              <div className="mt-4 text-lg font-semibold">
                Budget max : <span className="text-primary">{m.prix_max}</span>
              </div>
            )}
            {m.category_path && m.category_path.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Catégorie : {m.category_path.join(" › ")}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold">Vous voyagez bientôt vers {m.country} ?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inscrivez-vous pour accepter cette mission et gagner de l'argent.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/signup")}>Créer un compte</Button>
            <Button variant="outline" onClick={() => navigate("/login")}>Se connecter</Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/explore" className="text-sm text-muted-foreground hover:underline">
            ← Voir d'autres opportunités
          </Link>
        </div>
      </div>
    </div>
  );
}
