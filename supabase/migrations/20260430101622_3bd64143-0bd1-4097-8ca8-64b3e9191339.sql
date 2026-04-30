CREATE OR REPLACE FUNCTION public.get_landing_live_stats()
RETURNS TABLE (
  delivered_today bigint,
  delivered_total bigint,
  active_travelers bigint,
  countries_covered bigint,
  shipments_in_transit bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.shipments WHERE status = 'delivered' AND updated_at > now() - interval '24 hours'),
    (SELECT count(*) FROM public.shipments WHERE status = 'delivered'),
    (SELECT count(DISTINCT user_id) FROM public.voyages WHERE status IN ('active','open','published') AND departure_date >= current_date),
    (SELECT count(DISTINCT arrival_country) FROM public.voyages),
    (SELECT count(*) FROM public.shipments WHERE status IN ('in_transit','picked_up','accepted'));
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_live_stats() TO anon, authenticated;