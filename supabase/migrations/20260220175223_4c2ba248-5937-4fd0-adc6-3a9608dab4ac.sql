
-- Drop old function first (return type changed)
DROP FUNCTION IF EXISTS public.get_pending_shipments();

-- 1. Recreate with anonymous reference number, no user_id
CREATE OR REPLACE FUNCTION public.get_pending_shipments()
RETURNS TABLE (
  id uuid,
  ref_number text,
  departure_date date,
  departure_method text,
  departure_city text,
  arrival_city text,
  arrival_country text,
  size text,
  tarif text,
  insured boolean,
  is_international boolean,
  status text,
  photo_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id,
         'COLY-' || upper(left(s.id::text, 8)) AS ref_number,
         s.departure_date, s.departure_method, s.departure_city,
         s.arrival_city, s.arrival_country, s.size, s.tarif, s.insured,
         s.is_international, s.status, s.photo_url, s.created_at
  FROM public.shipments s
  WHERE s.status = 'pending'
  ORDER BY s.created_at DESC;
$$;

-- 2. Create secure function for needit missions WITHOUT user_id
CREATE OR REPLACE FUNCTION public.get_pending_needit_missions()
RETURNS TABLE (
  id uuid,
  ref_number text,
  product_name text,
  category_path text[],
  country text,
  city text,
  prix_max text,
  poids text,
  dimension text,
  timing text,
  is_unlisted boolean,
  unlisted_description text,
  photo_url text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id,
         'NEED-' || upper(left(m.id::text, 8)) AS ref_number,
         m.product_name, m.category_path, m.country, m.city,
         m.prix_max, m.poids, m.dimension, m.timing,
         m.is_unlisted, m.unlisted_description, m.photo_url,
         m.status, m.created_at
  FROM public.needit_missions m
  WHERE m.status = 'pending'
  ORDER BY m.created_at DESC;
$$;

-- 3. Drop the broad needit policy that exposes user_id
DROP POLICY IF EXISTS "Voyageurs can view pending missions" ON public.needit_missions;
