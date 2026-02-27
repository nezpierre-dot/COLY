-- Function to count active voyageurs heading to a given country (optionally city)
CREATE OR REPLACE FUNCTION public.count_voyageurs_for_destination(_country text, _city text DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.voyages v
  WHERE v.status = 'active'
    AND lower(v.arrival_country) = lower(_country)
    AND v.departure_date >= current_date
    AND (_city IS NULL OR _city = '' OR lower(v.arrival_city) = lower(_city));
$$;