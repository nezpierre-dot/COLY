import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Plane, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Nido, { type NidoPose } from "@/components/Nido";
import { localizeCity, localizeCountry } from "@/lib/geoLocalization";

export type FallbackKind = "voyages" | "missions";

interface FallbackItem {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
}

interface Props {
  kind: FallbackKind;
  /** Headline displayed above the CTA */
  title: string;
  /** Sub-text explaining the empty state */
  description: string;
  /** Label for the primary CTA button */
  ctaLabel: string;
  /** Path navigated to when the CTA is clicked */
  ctaTo: string;
  /** Optional Nido pose; defaults vary per kind */
  nido?: NidoPose;
  /** Limit for "elsewhere" examples */
  limit?: number;
  /** Optional click handler — if omitted, items navigate to public detail */
  onItemClick?: (item: FallbackItem) => void;
}

const ICONS: Record<FallbackKind, LucideIcon> = {
  voyages: Plane,
  missions: ShoppingBag,
};

/**
 * Empty-state component that combines a "be the first" CTA with a peek
 * at real activity from other cities to keep new users engaged.
 */
const EmptyZoneFallback = ({
  kind,
  title,
  description,
  ctaLabel,
  ctaTo,
  nido,
  limit = 5,
  onItemClick,
}: Props) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<FallbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const Icon = ICONS[kind];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (kind === "voyages") {
          const { data } = await supabase.rpc("get_public_voyages", {
            _limit: limit,
            _country: null,
          });
          if (!cancelled) {
            setItems(((data as any[]) || []).map((v) => ({
              id: v.id,
              departure_city: v.departure_city,
              departure_country: v.departure_country,
              arrival_city: v.arrival_city,
              arrival_country: v.arrival_country,
            })));
          }
        } else {
          const { data } = await supabase.rpc("get_public_pending_missions");
          if (!cancelled) {
            setItems(((data as any[]) || []).slice(0, limit).map((m) => ({
              id: m.id,
              departure_city: m.departure_city,
              departure_country: m.departure_country,
              arrival_city: m.arrival_city,
              arrival_country: m.arrival_country,
            })));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, limit]);

  const handleItemClick = (item: FallbackItem) => {
    if (onItemClick) onItemClick(item);
    else if (kind === "voyages") navigate(`/trajet/${item.id}`);
    else navigate(`/mission/${item.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5 px-2 py-6"
    >
      {/* CTA card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 text-center">
        <div className="flex flex-col items-center">
          <Nido pose={nido ?? (kind === "voyages" ? "fly" : "hello")} size="md" animate="float" />
          <p className="mt-3 text-base font-bold text-foreground tracking-tight">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-[320px] leading-relaxed">{description}</p>
          <button
            type="button"
            onClick={() => navigate(ctaTo)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Sparkles size={16} aria-hidden="true" />
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* "Elsewhere" peek */}
      <section aria-label="Activité ailleurs" className="space-y-2">
        <header className="flex items-center gap-2 px-1">
          <MapPin size={14} className="text-muted-foreground" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {kind === "voyages" ? "Trajets ailleurs" : "Missions ailleurs"}
          </h3>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            Aucune activité publique pour le moment. Sois le premier à lancer la communauté !
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(it)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 text-left hover:border-primary/40 hover:bg-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {localizeCity(it.departure_city)} → {localizeCity(it.arrival_city)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {localizeCountry(it.departure_country)} → {localizeCountry(it.arrival_country)}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  );
};

export default EmptyZoneFallback;
