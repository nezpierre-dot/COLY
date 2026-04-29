import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Search, X, Sparkles, Loader2, PenLine, Package, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { CATEGORIES, type CategoryKey } from "@/lib/categoryIcons";
import NeeditPageHeader from "../components/NeeditPageHeader";
import BrandImage from "../components/BrandImage";
import { useBrands, useBrandProducts, type Brand, type BrandProduct } from "../hooks/useBrandCatalog";
import { useNeeditDraft } from "../hooks/useNeeditDraft";
import { useTranslation } from "@/hooks/useTranslation";

type Phase = "brands" | "products";

const initials = (name: string) =>
  name
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Écran 2/3 — Marques + Produits style Vinted.
 * Une seule URL avec deux sous-vues animées (marques → produits) pour un
 * "passage direct" rapide entre les deux. Au clic produit → /needit/creer.
 */
const NeeditBrandsPage = () => {
  const navigate = useNavigate();
  const { catKey } = useParams<{ catKey: CategoryKey }>();
  const { draft, update } = useNeeditDraft();
  const { t } = useTranslation();
  const category = useMemo(() => CATEGORIES.find((c) => c.key === catKey), [catKey]);

  const [phase, setPhase] = useState<Phase>("brands");
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Si pas de catégorie valide → retour catégories
  useEffect(() => {
    if (!category) navigate("/needit/categories", { replace: true });
  }, [category, navigate]);

  // Persister la catégorie dans le brouillon
  useEffect(() => {
    if (category) update({ categoryKey: category.key, categoryLabel: category.label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.key]);

  if (!category) return null;

  const handleBack = () => {
    if (phase === "products") {
      setPhase("brands");
      setSearch("");
      setSelectedBrand(null);
      return;
    }
    navigate("/needit/categories");
  };

  const handleBrandPick = (brand: Brand) => {
    setSelectedBrand(brand);
    update({
      brand: { id: brand.id, name: brand.name, logo_url: brand.logo_url, category_key: brand.category_key },
      brandProduct: undefined,
      variant: null,
    });
    setSearch("");
    setPhase("products");
  };

  const handleProductPick = (product: BrandProduct, variant: string | null) => {
    update({
      brandProduct: {
        id: product.id,
        name: product.name,
        photo_url: product.photo_url,
        indicative_price: product.indicative_price,
        variants: product.variants,
      },
      variant,
    });
    navigate("/needit/creer");
  };

  const handleSkipBrand = () => {
    // Pas de marque listée → passer direct à la création libre
    update({ brand: undefined, brandProduct: undefined, variant: null });
    navigate("/needit/creer");
  };

  const handleSkipProduct = () => {
    // Marque OK mais pas de produit précis → continuer avec la marque seule
    update({ brandProduct: undefined, variant: null });
    navigate("/needit/creer");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <NeeditPageHeader
        title={phase === "brands" ? t("needit.brands.titlePrefix", { cat: category.label }) : selectedBrand?.name ?? t("needit.brands.products")}
        subtitle={
          phase === "brands"
            ? t("needit.brands.stepBrand")
            : t("needit.brands.stepProduct", { cat: category.label })
        }
        onBack={handleBack}
      />

      <main className="flex-1 px-4 sm:px-5 pt-4 pb-32 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {phase === "brands" ? (
            <motion.div
              key="brands"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <BrandsView
                category={category}
                search={search}
                setSearch={setSearch}
                onPick={handleBrandPick}
                onSkip={handleSkipBrand}
              />
            </motion.div>
          ) : (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              {selectedBrand && (
                <ProductsView
                  brand={selectedBrand}
                  preselect={draft.brandProduct?.id}
                  preselectVariant={draft.variant ?? null}
                  onPick={handleProductPick}
                  onSkip={handleSkipProduct}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Marques                                                              */
/* ------------------------------------------------------------------ */

const BrandsView = ({
  category,
  search,
  setSearch,
  onPick,
  onSkip,
}: {
  category: (typeof CATEGORIES)[number];
  search: string;
  setSearch: (v: string) => void;
  onPick: (b: Brand) => void;
  onSkip: () => void;
}) => {
  const { t } = useTranslation();
  const { brands, loading } = useBrands(category.key);
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () => (q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands),
    [brands, q],
  );

  const popular = useMemo(() => {
    if (!q) return filtered.filter((b) => b.is_popular);
    return filtered
      .filter((b) => b.is_popular || b.name.toLowerCase().startsWith(q))
      .slice(0, 9);
  }, [filtered, q]);

  const popularIds = new Set(popular.map((b) => b.id));
  const others = filtered.filter((b) => !popularIds.has(b.id));

  if (!loading && brands.length === 0) {
    return (
      <EmptyCard
        title={t("needit.brands.noBrands")}
        description={t("needit.brands.noBrandsDesc")}
        cta={t("needit.brands.continueNoBrand")}
        onClick={onSkip}
      />
    );
  }

  return (
    <>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("needit.brands.searchBrand")}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyCard
          title={t("needit.brands.noBrandFound")}
          description={t("needit.brands.noBrandFoundDesc", { q: search })}
          cta={t("needit.brands.continueNoBrand")}
          onClick={onSkip}
        />
      ) : (
        <>
          {popular.length > 0 && (
            <Section
              title={q ? t("needit.brands.popularSugg") : t("needit.brands.popular")}
              icon={<Sparkles size={14} className="text-accent" />}
            >
              <BrandGrid brands={popular} onPick={onPick} />
            </Section>
          )}
          {others.length > 0 && (
            <Section title={q ? t("needit.brands.results") : t("needit.brands.allBrands")}>
              <BrandGrid brands={others} onPick={onPick} />
            </Section>
          )}

          <button
            onClick={onSkip}
            className="w-full mt-2 py-4 rounded-2xl bg-muted hover:bg-muted/70 text-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {t("needit.brands.brandNotListed")}
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </>
  );
};

const BrandGrid = ({
  brands,
  onPick,
}: {
  brands: Brand[];
  onPick: (b: Brand) => void;
}) => (
  <div className="grid grid-cols-3 gap-3 sm:gap-4">
    {brands.map((b, i) => (
      <motion.button
        key={b.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.025, 0.25) }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPick(b)}
        className="flex flex-col items-center justify-center gap-2.5 p-3 aspect-square rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
      >
        <BrandImage
          src={b.logo_url}
          alt={b.name}
          kind="logo"
          className="w-16 h-16 rounded-2xl"
          imgClassName="object-contain p-1.5"
          fallback={<span className="text-base font-bold text-primary">{initials(b.name)}</span>}
        />
        <span className="text-xs sm:text-[13px] font-semibold text-foreground text-center leading-tight line-clamp-2">
          {b.name}
        </span>
      </motion.button>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Produits                                                             */
/* ------------------------------------------------------------------ */

const ProductsView = ({
  brand,
  preselect,
  preselectVariant,
  onPick,
  onSkip,
}: {
  brand: Brand;
  preselect?: string;
  preselectVariant: string | null;
  onPick: (p: BrandProduct, v: string | null) => void;
  onSkip: () => void;
}) => {
  const { t } = useTranslation();
  const { products, loading } = useBrandProducts(brand.id);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, q]);

  if (!loading && products.length === 0) {
    return (
      <EmptyCard
        title={t("needit.brands.noProducts")}
        description={t("needit.brands.noProductsDesc", { brand: brand.name })}
        cta={t("needit.brands.continueNoProduct")}
        onClick={onSkip}
      />
    );
  }

  return (
    <>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("needit.brands.searchProduct", { brand: brand.name })}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyCard
          title={t("needit.brands.noProductFound")}
          description={t("needit.brands.noProductFoundDesc", { q: search })}
          cta={t("needit.brands.continueNoProduct")}
          onClick={onSkip}
        />
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((p, i) => (
              <ProductRow
                key={p.id}
                product={p}
                index={i}
                preselectedVariant={p.id === preselect ? preselectVariant : undefined}
                onPick={(v) => onPick(p, v)}
              />
            ))}
          </div>

          <button
            onClick={onSkip}
            className="w-full mt-4 py-4 rounded-2xl bg-muted hover:bg-muted/70 text-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {t("needit.brands.productNotListed")}
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </>
  );
};

const ProductRow = ({
  product,
  index,
  preselectedVariant,
  onPick,
}: {
  product: BrandProduct;
  index: number;
  preselectedVariant?: string | null;
  onPick: (variant: string | null) => void;
}) => {
  const { t } = useTranslation();
  const hasVariants = product.variants.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="rounded-3xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        <BrandImage
          src={product.photo_url}
          alt={product.name}
          kind="produit"
          className="w-20 h-20 rounded-2xl"
          imgClassName="object-cover"
          fallback={<Package size={28} className="text-primary/70" aria-hidden="true" />}
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground leading-tight mb-1">
            {product.name}
          </p>
          {product.indicative_price && (
            <p className="text-sm text-muted-foreground">
              {t("needit.brands.indicativePrice")}{" "}
              <span className="font-semibold text-foreground">{product.indicative_price}</span>
            </p>
          )}
        </div>
      </div>

      {hasVariants ? (
        <div className="flex flex-wrap gap-2 mt-4">
          {product.variants.map((v) => {
            const isActive = preselectedVariant === v;
            return (
              <button
                key={v}
                onClick={() => onPick(v)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => onPick(null)}
          className="w-full mt-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          {t("needit.brands.choose")}
        </button>
      )}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const SearchBar = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => {
  const { t } = useTranslation();
  return (
  <div className="sticky top-[68px] z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-background/80 backdrop-blur-md mb-4">
    <label className="flex items-center gap-3 px-4 h-14 rounded-2xl bg-muted border border-border focus-within:border-primary focus-within:bg-card transition-all shadow-sm">
      <Search size={20} className="text-muted-foreground shrink-0" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label={t("needit.brands.clearSearch")}
          className="shrink-0 w-8 h-8 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/25 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-foreground" />
        </button>
      )}
    </label>
  </div>
);

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h3 className="flex items-center gap-2 text-sm font-bold text-foreground/80 uppercase tracking-wider mb-3 px-1">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

const EmptyCard = ({
  title,
  description,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) => (
  <div className="text-center rounded-3xl border border-dashed border-border bg-muted/30 p-8">
    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
      <PenLine className="text-primary" size={28} />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">{description}</p>
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
    >
      {cta}
      <ChevronRight size={16} />
    </button>
  </div>
);

export default NeeditBrandsPage;
