CREATE OR REPLACE FUNCTION public.get_public_voyages_by_route(_from text, _to text, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, ref_number text, departure_city text, departure_country text, arrival_city text, arrival_country text, departure_date date, transport_method text, max_weight_kg numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id,
    'VOY-' || upper(left(v.id::text, 8)) AS ref_number,
    v.departure_city,
    v.departure_country,
    v.arrival_city,
    v.arrival_country,
    v.departure_date,
    v.transport_method,
    v.max_weight_kg
  FROM public.voyages v
  WHERE v.status = 'active'
    AND v.departure_date >= current_date
    AND lower(v.departure_city) = lower(_from)
    AND lower(v.arrival_city) = lower(_to)
  ORDER BY v.departure_date ASC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_voyages_by_route(text, text, integer) TO anon, authenticated;