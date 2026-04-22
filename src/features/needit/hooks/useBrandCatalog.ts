import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  category_key: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_popular: boolean;
  sort_order: number;
}

export interface BrandProduct {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  variants: string[];
  indicative_price: string | null;
  sort_order: number;
}

export const useBrands = (categoryKey: string | null) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryKey) {
      setBrands([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("brands")
      .select("*")
      .eq("category_key", categoryKey)
      .order("is_popular", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setBrands((data as Brand[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryKey]);

  return { brands, loading };
};

export const useBrandProducts = (brandId: string | null) => {
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("brand_products")
      .select("*")
      .eq("brand_id", brandId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setProducts((data as BrandProduct[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  return { products, loading };
};
