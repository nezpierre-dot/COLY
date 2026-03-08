
-- Index for faster matching queries on voyages
CREATE INDEX IF NOT EXISTS idx_voyages_matching 
ON public.voyages (status, departure_date, arrival_country, arrival_city)
WHERE status = 'active';

-- Index for faster rating lookups
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id 
ON public.ratings (rated_id);

-- Improved matching function with distance-aware scoring
CREATE OR REPLACE FUNCTION public.get_matching_voyageurs(
  _destination_country text,
  _destination_city text DEFAULT NULL,
  _departure_date date DEFAULT NULL,
  _max_weight_kg numeric DEFAULT NULL,
  _limit integer DEFAULT 5
)
RETURNS TABLE(
  voyageur_id uuid,
  full_name text,
  avatar_url text,
  departure_city text,
  departure_country text,
  arrival_city text,
  arrival_country text,
  departure_date date,
  transport_method text,
  max_weight_kg numeric,
  max_items integer,
  average_score numeric,
  total_ratings bigint,
  voyage_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    v.id AS voyage_id
  FROM public.voyages v
  INNER JOIN public.profiles p ON p.user_id = v.user_id
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(rat.score)::numeric, 1) AS avg_score, COUNT(*) AS cnt
    FROM public.ratings rat
    WHERE rat.rated_id = v.user_id
  ) r ON true
  WHERE v.status = 'active'
    AND v.departure_date >= CURRENT_DATE
    AND lower(v.arrival_country) = lower(_destination_country)
    AND (_destination_city IS NULL OR _destination_city = '' OR lower(v.arrival_city) = lower(_destination_city))
    AND (_max_weight_kg IS NULL OR v.max_weight_kg IS NULL OR v.max_weight_kg >= _max_weight_kg)
    AND v.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY
    -- Exact city match first
    CASE WHEN _destination_city IS NOT NULL AND lower(v.arrival_city) = lower(_destination_city) THEN 0 ELSE 1 END ASC,
    -- Prioritize high-rated voyageurs
    COALESCE(r.avg_score, 0) DESC,
    -- Then by date proximity if a departure date is provided
    CASE WHEN _departure_date IS NOT NULL
      THEN ABS(v.departure_date - _departure_date)
      ELSE 0
    END ASC,
    -- Then by number of ratings (more trusted)
    COALESCE(r.cnt, 0) DESC,
    -- Then by closest departure date
    v.departure_date ASC
  LIMIT _limit;
END;
$$;
