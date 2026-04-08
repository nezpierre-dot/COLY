
DROP FUNCTION IF EXISTS public.get_matching_voyageurs(text, text, date, numeric, integer);

CREATE FUNCTION public.get_matching_voyageurs(_destination_country text, _destination_city text DEFAULT NULL::text, _departure_date date DEFAULT NULL::date, _max_weight_kg numeric DEFAULT NULL::numeric, _limit integer DEFAULT 10)
 RETURNS TABLE(voyageur_id uuid, full_name text, avatar_url text, departure_city text, departure_country text, arrival_city text, arrival_country text, departure_date date, transport_method text, max_weight_kg numeric, max_items integer, average_score numeric, total_ratings bigint, voyage_id uuid, kyc_status text, trust_badges text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    v.user_id AS voyageur_id,
    p.full_name,
    p.avatar_url,
    v.departure_city,
    v.departure_country,
    v.arrival_city,
    v.arrival_country,
    v.departure_date,
    v.transport_method,
    v.max_weight_kg,
    v.max_items,
    COALESCE(r.avg_score, 0) AS average_score,
    COALESCE(r.cnt, 0) AS total_ratings,
    v.id AS voyage_id,
    p.kyc_status,
    p.trust_badges
  FROM public.voyages v
  INNER JOIN public.profiles p ON p.user_id = v.user_id
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(rat.score)::numeric, 1) AS avg_score, COUNT(*) AS cnt
    FROM public.ratings rat
    WHERE rat.rated_id = v.user_id
  ) r ON true
  WHERE v.status = 'active'
    AND v.departure_date >= CURRENT_DATE
    AND (v.departure_date + COALESCE(v.departure_time, '00:00')::time) > (now() + (COALESCE(v.cutoff_hours, 24) || ' hours')::interval)
    AND lower(v.arrival_country) = lower(_destination_country)
    AND (_destination_city IS NULL OR _destination_city = '' OR lower(v.arrival_city) = lower(_destination_city))
    AND (_max_weight_kg IS NULL OR v.max_weight_kg IS NULL OR v.max_weight_kg >= _max_weight_kg)
    AND v.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (v.max_items IS NULL OR (
      (SELECT COUNT(*) FROM public.shipments s
       WHERE s.voyageur_id = v.user_id AND s.status IN ('accepted','picked_up','in_transit')
         AND lower(s.arrival_country) = lower(v.arrival_country)
         AND s.departure_date = v.departure_date)
      +
      (SELECT COUNT(*) FROM public.needit_missions m
       WHERE m.voyageur_id = v.user_id AND m.status IN ('accepted','picked_up','in_transit')
         AND lower(m.country) = lower(v.arrival_country))
    ) < v.max_items)
  ORDER BY
    CASE WHEN _destination_city IS NOT NULL AND lower(v.arrival_city) = lower(_destination_city) THEN 0 ELSE 1 END ASC,
    CASE WHEN _departure_date IS NOT NULL AND v.departure_date = _departure_date THEN 0 ELSE 1 END ASC,
    (
      CASE WHEN p.kyc_status = 'verified' THEN 3 ELSE 0 END
      + COALESCE(array_length(p.trust_badges, 1), 0)
      + CASE WHEN COALESCE(r.avg_score, 0) >= 4.8 THEN 2 ELSE 0 END
      + CASE WHEN COALESCE(r.cnt, 0) >= 10 THEN 1 ELSE 0 END
    ) DESC,
    COALESCE(r.avg_score, 0) DESC,
    CASE WHEN _departure_date IS NOT NULL
      THEN ABS(v.departure_date - _departure_date)
      ELSE 0
    END ASC,
    COALESCE(r.cnt, 0) DESC,
    v.departure_date ASC,
    (COALESCE(v.departure_time, '00:00')::time) ASC
  LIMIT _limit;
END;
$function$;
