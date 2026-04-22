import { useMemo, useState } from "react";
import { Search, Loader2, ChevronRight, X, ImageOff, Sparkles, PenLine } from "lucide-react";
import { motion } from "framer-motion";
import { useBrands, type Brand } from "../hooks/useBrandCatalog";

interface Props {
  categoryKey: string;
  categoryLabel: string;
  onSelect: (brand: Brand) => void;
  onSkip: () => void;
}

const initials = (name: string) =>
  name
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const BrandPicker = ({ categoryKey, categoryLabel, onSelect, onSkip }: Props) => {
  const { brands, loading } = useBrands(categoryKey);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, q]);

  // Quand on tape, "populaires" = matchs marqués populaires OU matchs commençant par la requête
  const popular = useMemo(() => {
    if (!q) return filtered.filter((b) => b.is_popular);
    return filtered
      .filter((b) => b.is_popular || b.name.toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [filtered, q]);

  const popularIds = new Set(popular.map((b) => b.id));
  const others = filtered.filter((b) => !popularIds.has(b.id));
  const visibleOthers = showAll || q ? others : others.slice(0, 6);

  // Catégorie sans aucune marque référencée → fallback explicite
  if (!loading && brands.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-4">
          Marques de {categoryLabel}
        </h2>
        <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
            <PenLine className="text-primary" size={28} />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Pas de marques répertoriées
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Cette catégorie n'a pas encore de catalogue de marques. Décrivez librement le produit
            recherché à l'étape suivante.
          </p>
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Saisir manuellement <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground text-center mb-4">
        Marques de {categoryLabel}
      </h2>

      {/* Search */}
      <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-2xl bg-muted/50 border border-border focus-within:border-primary/50 transition-colors">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une marque…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Effacer la recherche"
            className="shrink-0 w-6 h-6 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors"
          >
            <X size={12} className="text-foreground" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground mb-1">Aucune marque trouvée pour</p>
          <p className="text-base font-semibold text-foreground mb-4">"{search}"</p>
          <button
            onClick={onSkip}
            className="text-sm text-primary font-medium underline underline-offset-2"
          >
            Continuer sans marque
          </button>
        </div>
      ) : (
        <>
          {popular.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Sparkles size={12} className="text-primary" />
                {q ? "Suggestions populaires" : "Populaires"}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {popular.map((b, i) => (
                  <BrandCard key={b.id} brand={b} index={i} onSelect={() => onSelect(b)} />
                ))}
              </div>
            </>
          )}

          {visibleOthers.length > 0 && (
            <>
              {!q && popular.length > 0 && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Toutes les marques
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {visibleOthers.map((b, i) => (
                  <BrandCard key={b.id} brand={b} index={i} onSelect={() => onSelect(b)} />
                ))}
              </div>
            </>
          )}

          {!q && !showAll && others.length > 6 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-3 rounded-2xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors mb-4"
            >
              Voir toutes les marques ({others.length})
            </button>
          )}

          <button
            onClick={onSkip}
            className="w-full mt-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            Ma marque n'est pas listée <ChevronRight size={14} />
          </button>
        </>
      )}
    </div>
  );
};

const BrandCard = ({
  brand,
  index,
  onSelect,
}: {
  brand: Brand;
  index: number;
  onSelect: () => void;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.03, 0.3) }}
    onClick={onSelect}
    className="relative flex flex-col items-center gap-2 p-3 aspect-square rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
  >
    {brand.logo_url ? (
      <img
        src={brand.logo_url}
        alt={brand.name}
        className="w-16 h-16 object-contain"
      />
    ) : (
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <span className="text-base font-bold text-primary">{initials(brand.name)}</span>
        <span
          aria-label="Sans photo"
          className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted border border-border text-[9px] font-semibold text-muted-foreground"
        >
          <ImageOff size={8} />
        </span>
      </div>
    )}
    <span className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">
      {brand.name}
    </span>
  </motion.button>
);

export default BrandPicker;
