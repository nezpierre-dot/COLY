import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Package, Trash2, Loader2, Plus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from "@/hooks/useTranslation";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import PageTransition, { staggerContainer, staggerItem } from "@/components/PageTransition";
import { toast } from "sonner";

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { routes, products, loadingRoutes, loadingProducts, removeRoute, removeProduct } = useFavorites();
  const [tab, setTab] = useState("routes");

  const handleRemoveRoute = async (id: string) => {
    await removeRoute(id);
    toast.success(t("favorites.routeRemoved"));
  };

  const handleRemoveProduct = async (id: string) => {
    await removeProduct(id);
    toast.success(t("favorites.productRemoved"));
  };

  const handleReorderProduct = (product: typeof products[0]) => {
    // Navigate to needit-mission with prefilled data
    const params = new URLSearchParams({
      product_name: product.product_name || "",
      country: product.country,
      ...(product.city ? { city: product.city } : {}),
      ...(product.prix_max ? { prix_max: product.prix_max } : {}),
      ...(product.ean_code ? { ean_code: product.ean_code } : {}),
    });
    navigate(`/needit-mission?${params.toString()}`);
  };

  return (
    <div className="page-shell">
      <header className="page-header-soft">
        <div className="page-content">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="icon-btn-soft" aria-label="Retour">
              <ArrowLeft size={18} className="text-foreground" />
            </button>
          </div>
          <span className="greeting-bubble-xl mb-3">
            <Heart size={18} className="text-destructive" fill="currentColor" />
            {t("favorites.title")}
          </span>
          <h1 className="text-[clamp(1.85rem,5.5vw,2.4rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Vos coups<br />
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">de cœur ❤️</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground font-medium max-w-[280px]">
            Itinéraires & produits sauvegardés pour aller plus vite ✨
          </p>
        </div>
      </header>

      <main className="page-content pt-6">
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="routes" className="flex-1 text-xs gap-1"><MapPin size={14} />{t("favorites.tabRoutes")}</TabsTrigger>
            <TabsTrigger value="products" className="flex-1 text-xs gap-1"><Package size={14} />{t("favorites.tabProducts")}</TabsTrigger>
          </TabsList>

          <TabsContent value="routes">
            {loadingRoutes ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : routes.length === 0 ? (
              <EmptyState icon={MapPin} title={t("favorites.noRoutes")} description={t("favorites.noRoutesDesc")} />
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                {routes.map((r) => (
                  <motion.div key={r.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{r.from_city} → {r.to_city}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/voyageur-search?from=${encodeURIComponent(r.from_city)}&to=${encodeURIComponent(r.to_city)}`)} className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <ArrowRight size={16} />
                      </button>
                      <button onClick={() => handleRemoveRoute(r.id)} className="p-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {loadingProducts ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : products.length === 0 ? (
              <EmptyState icon={Package} title={t("favorites.noProducts")} description={t("favorites.noProductsDesc")} />
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                {products.map((p) => (
                  <motion.div key={p.id} variants={staggerItem} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.product_name || ""} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <Package size={20} className="text-accent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{p.product_name || t("needit.unlistedProduct")}</p>
                        <p className="text-xs text-muted-foreground">{p.country}{p.city ? ` · ${p.city}` : ""}</p>
                        {p.prix_max && <p className="text-xs font-bold mt-1" style={{ color: "#30D158" }}>Budget max : {p.prix_max}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleReorderProduct(p)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                        <Plus size={14} /> {t("favorites.reorder")}
                      </button>
                      <button onClick={() => handleRemoveProduct(p.id)} className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default FavoritesPage;
