
-- Favorite routes table
CREATE TABLE public.favorite_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite routes" ON public.favorite_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own favorite routes" ON public.favorite_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite routes" ON public.favorite_routes FOR DELETE USING (auth.uid() = user_id);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_favorite_routes_unique ON public.favorite_routes (user_id, lower(from_city), lower(to_city));

-- Favorite NeedIt products table
CREATE TABLE public.favorite_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  category_path TEXT[] NOT NULL DEFAULT '{}',
  prix_max TEXT,
  poids TEXT,
  dimension TEXT,
  photo_url TEXT,
  ean_code TEXT,
  is_unlisted BOOLEAN NOT NULL DEFAULT false,
  unlisted_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite products" ON public.favorite_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own favorite products" ON public.favorite_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite products" ON public.favorite_products FOR DELETE USING (auth.uid() = user_id);
