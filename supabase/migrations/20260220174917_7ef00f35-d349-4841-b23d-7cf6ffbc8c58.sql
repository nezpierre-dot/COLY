
-- 1. Drop the overly permissive policy that exposes contact info
DROP POLICY IF EXISTS "Voyageurs can view pending shipments" ON public.shipments;

-- 2. Add restrictive policy: assigned voyageurs can see their shipments (including contact info)
CREATE POLICY "Assigned voyageurs can view their shipments"
ON public.shipments FOR SELECT
USING (auth.uid() = voyageur_id);

-- 3. Create secure function that returns pending shipments WITHOUT contact fields
CREATE OR REPLACE FUNCTION public.get_pending_shipments()
RETURNS TABLE (
  id uuid,
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
  SELECT s.id, s.departure_date, s.departure_method, s.departure_city,
         s.arrival_city, s.arrival_country, s.size, s.tarif, s.insured,
         s.is_international, s.status, s.photo_url, s.created_at
  FROM public.shipments s
  WHERE s.status = 'pending'
  ORDER BY s.created_at DESC;
$$;
