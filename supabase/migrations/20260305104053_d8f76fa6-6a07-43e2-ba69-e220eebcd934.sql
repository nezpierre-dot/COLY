
-- Drop overly permissive policies that allow anyone (including anon) to write to ean_products
-- The service role used by the ean-lookup edge function bypasses RLS automatically
DROP POLICY IF EXISTS "Service role can insert EAN products" ON public.ean_products;
DROP POLICY IF EXISTS "Service role can update EAN products" ON public.ean_products;
