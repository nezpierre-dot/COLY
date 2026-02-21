
-- Table cache pour les produits EAN-13
CREATE TABLE public.ean_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ean_code text NOT NULL UNIQUE,
  product_name text,
  brand text,
  image_url text,
  weight text,
  category text,
  source text NOT NULL DEFAULT 'openfoodfacts',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par EAN
CREATE INDEX idx_ean_products_ean_code ON public.ean_products (ean_code);

-- RLS
ALTER TABLE public.ean_products ENABLE ROW LEVEL SECURITY;

-- Lecture publique (données produit non sensibles)
CREATE POLICY "Anyone can read EAN products"
ON public.ean_products FOR SELECT
USING (true);

-- Seul le service role insère (via edge function)
CREATE POLICY "Service role can insert EAN products"
ON public.ean_products FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update EAN products"
ON public.ean_products FOR UPDATE
USING (true);

-- Trigger updated_at
CREATE TRIGGER update_ean_products_updated_at
BEFORE UPDATE ON public.ean_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter colonne ean_code aux needit_missions pour le lien produit
ALTER TABLE public.needit_missions
ADD COLUMN ean_code text;

-- Ajouter colonne ean_verified pour le voyageur
ALTER TABLE public.needit_missions
ADD COLUMN ean_verified boolean NOT NULL DEFAULT false;
