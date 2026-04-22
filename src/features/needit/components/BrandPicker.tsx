import { useMemo, useState } from "react";
import { Search, Loader2, ChevronRight } from "lucide-react";
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

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const popular = filtered.filter((b) => b.is_popular);
  const others = filtered.filter((b) => !b.is_popular);
  const visibleOthers = showAll || search ? others : others.slice(0, 6);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground text-center mb-4">
        Marques de {categoryLabel}
      </h2>

      {/* Search */}
      <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une marque…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground mb-4">Aucune marque trouvée</p>
          <button
            onClick={onSkip}
            className="text-sm text-primary font-medium underline underline-offset-2"
          >
            Continuer sans marque
          </button>
        </div>
      ) : (
        <>
          {!search && popular.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Populaires
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
              {!search && (
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

          {!search && !showAll && others.length > 6 && (
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
    className="flex flex-col items-center gap-2 p-3 aspect-square rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
  >
    {brand.logo_url ? (
      <img src={brand.logo_url} alt={brand.name} className="w-14 h-14 object-contain" />
    ) : (
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <span className="text-base font-bold text-primary">{initials(brand.name)}</span>
      </div>
    )}
    <span className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">
      {brand.name}
    </span>
  </motion.button>
);

export default BrandPicker;
