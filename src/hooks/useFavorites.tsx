import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FavRoute {
  id: string;
  from_city: string;
  to_city: string;
  created_at: string;
}

interface FavProduct {
  id: string;
  product_name: string;
  country: string;
  city: string | null;
  category_path: string[];
  prix_max: string | null;
  poids: string | null;
  dimension: string | null;
  photo_url: string | null;
  ean_code: string | null;
  is_unlisted: boolean;
  unlisted_description: string | null;
  created_at: string;
}

interface FavoritesContextType {
  routes: FavRoute[];
  products: FavProduct[];
  loadingRoutes: boolean;
  loadingProducts: boolean;
  addRoute: (from: string, to: string) => Promise<void>;
  removeRoute: (id: string) => Promise<void>;
  isRouteFavorite: (from: string, to: string) => boolean;
  addProduct: (product: Omit<FavProduct, "id" | "created_at">) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  refreshRoutes: () => void;
  refreshProducts: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<FavRoute[]>([]);
  const [products, setProducts] = useState<FavProduct[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchRoutes = useCallback(async () => {
    if (!user) { setRoutes([]); return; }
    setLoadingRoutes(true);
    const { data } = await supabase
      .from("favorite_routes")
      .select("*")
      .order("created_at", { ascending: false });
    setRoutes((data as FavRoute[]) ?? []);
    setLoadingRoutes(false);
  }, [user]);

  const fetchProducts = useCallback(async () => {
    if (!user) { setProducts([]); return; }
    setLoadingProducts(true);
    const { data } = await supabase
      .from("favorite_products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts((data as FavProduct[]) ?? []);
    setLoadingProducts(false);
  }, [user]);

  useEffect(() => { fetchRoutes(); fetchProducts(); }, [fetchRoutes, fetchProducts]);

  const addRoute = async (from: string, to: string) => {
    if (!user) return;
    await supabase.from("favorite_routes").insert({ user_id: user.id, from_city: from, to_city: to });
    fetchRoutes();
  };

  const removeRoute = async (id: string) => {
    await supabase.from("favorite_routes").delete().eq("id", id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const isRouteFavorite = (from: string, to: string) =>
    routes.some((r) => r.from_city.toLowerCase() === from.toLowerCase() && r.to_city.toLowerCase() === to.toLowerCase());

  const addProduct = async (product: Omit<FavProduct, "id" | "created_at">) => {
    if (!user) return;
    await supabase.from("favorite_products").insert({ ...product, user_id: user.id });
    fetchProducts();
  };

  const removeProduct = async (id: string) => {
    await supabase.from("favorite_products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <FavoritesContext.Provider value={{
      routes, products, loadingRoutes, loadingProducts,
      addRoute, removeRoute, isRouteFavorite,
      addProduct, removeProduct,
      refreshRoutes: fetchRoutes, refreshProducts: fetchProducts,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
