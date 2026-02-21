
-- Restreindre INSERT/UPDATE aux utilisateurs authentifiés uniquement (l'edge function utilise service_role qui bypass RLS)
DROP POLICY "Service role can insert EAN products" ON public.ean_products;
DROP POLICY "Service role can update EAN products" ON public.ean_products;

-- Aucun utilisateur front ne peut insérer/modifier directement
CREATE POLICY "No direct insert for users"
ON public.ean_products FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update for users"
ON public.ean_products FOR UPDATE
USING (false);
