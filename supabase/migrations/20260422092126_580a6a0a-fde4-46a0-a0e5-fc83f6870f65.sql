-- Brands per category and their products
CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (category_key, slug)
);

CREATE INDEX idx_brands_category ON public.brands(category_key);
CREATE INDEX idx_brands_popular ON public.brands(category_key, is_popular) WHERE is_popular = true;

CREATE TABLE public.brand_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  photo_url text,
  variants text[] NOT NULL DEFAULT '{}'::text[],
  indicative_price text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_products_brand ON public.brand_products(brand_id);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

-- Anyone can read the catalog
CREATE POLICY "Anyone can read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Anyone can read brand products" ON public.brand_products FOR SELECT USING (true);

-- Only admins can write
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage brand products" ON public.brand_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update timestamp triggers
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_products_updated_at BEFORE UPDATE ON public.brand_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
