import { useMemo, useState } from "react";
import { Search, Loader2, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useBrandProducts, type Brand, type BrandProduct } from "../hooks/useBrandCatalog";

interface Props {
  brand: Brand;
  selected?: { product: BrandProduct; variant: string | null } | null;
  onSelect: (product: BrandProduct, variant: string | null) => void;
  onSkip: () => void;
}

const BrandProductPicker = ({ brand, selected, onSelect, onSkip }: Props) => {
  const { products, loading } = useBrandProducts(brand.id);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground text-center mb-1">{brand.name}</h2>
      <p className="text-center text-sm text-muted-foreground mb-5">Sélectionnez un produit</p>

      <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher dans ${brand.name}…`}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Package className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground mb-4">
            {products.length === 0
              ? "Aucun produit référencé pour cette marque"
              : "Aucun produit ne correspond"}
          </p>
          <button
            onClick={onSkip}
            className="text-sm text-primary font-medium underline underline-offset-2"
          >
            Saisir le produit manuellement
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {filtered.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                selected={selected?.product.id === p.id ? selected.variant : undefined}
                onSelect={(variant) => onSelect(p, variant)}
              />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Mon produit n'est pas listé
          </button>
        </>
      )}
    </div>
  );
};

const ProductCard = ({
  product,
  index,
  selected,
  onSelect,
}: {
  product: BrandProduct;
  index: number;
  selected?: string | null;
  onSelect: (variant: string | null) => void;
}) => {
  const hasVariants = product.variants.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={`rounded-2xl border bg-card p-4 transition-all ${
        selected !== undefined
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex gap-3">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0">
            <Package size={20} className="text-primary/60" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">
            {product.name}
          </p>
          {product.indicative_price && (
            <p className="text-xs text-muted-foreground">{product.indicative_price}</p>
          )}
        </div>
      </div>

      {hasVariants ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {product.variants.map((v) => {
            const isActive = selected === v;
            return (
              <button
                key={v}
                onClick={() => onSelect(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => onSelect(null)}
          className={`w-full mt-3 py-2 rounded-xl text-xs font-medium transition-all ${
            selected === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          Sélectionner ce produit
        </button>
      )}
    </motion.div>
  );
};

export default BrandProductPicker;
