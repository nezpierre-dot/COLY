-- Public function to get all pending missions for the public map (only non-sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_pending_missions()
RETURNS TABLE(
  id uuid,
  type text,
  departure_city text,
  departure_country text,
  arrival_city text,
  arrival_country text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pending shipments (colis)
  RETURN QUERY
  SELECT
    s.id,
    'colis'::text AS type,
    s.departure_city AS departure_city,
    s.arrival_country AS departure_country,
    s.arrival_city AS arrival_city,
    s.arrival_country AS arrival_country
  FROM public.shipments s
  WHERE s.status = 'pending';

  -- Pending NeedIt missions
  RETURN QUERY
  SELECT
    m.id,
    'needit'::text AS type,
    COALESCE(m.city, m.country) AS departure_city,
    m.country AS departure_country,
    NULL::text AS arrival_city,
    NULL::text AS arrival_country
  FROM public.needit_missions m
  WHERE m.status = 'pending';
END;
$$;