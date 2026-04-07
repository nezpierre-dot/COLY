
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_limit integer DEFAULT 10)
RETURNS TABLE(
  voyageur_id uuid,
  full_name text,
  avatar_url text,
  weekly_deliveries bigint,
  average_score numeric,
  total_ratings bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_deliveries AS (
    SELECT
      s.voyageur_id,
      count(*) AS cnt
    FROM shipments s
    WHERE s.status = 'delivered'
      AND s.voyageur_id IS NOT NULL
      AND s.updated_at >= date_trunc('week', now())
    GROUP BY s.voyageur_id
  ),
  week_missions AS (
    SELECT
      nm.voyageur_id,
      count(*) AS cnt
    FROM needit_missions nm
    WHERE nm.status = 'completed'
      AND nm.voyageur_id IS NOT NULL
      AND nm.updated_at >= date_trunc('week', now())
    GROUP BY nm.voyageur_id
  ),
  combined AS (
    SELECT
      COALESCE(wd.voyageur_id, wm.voyageur_id) AS voyageur_id,
      COALESCE(wd.cnt, 0) + COALESCE(wm.cnt, 0) AS weekly_deliveries
    FROM week_deliveries wd
    FULL OUTER JOIN week_missions wm ON wd.voyageur_id = wm.voyageur_id
  )
  SELECT
    c.voyageur_id,
    p.full_name,
    p.avatar_url,
    c.weekly_deliveries,
    COALESCE(r.avg_score, 0) AS average_score,
    COALESCE(r.total, 0) AS total_ratings
  FROM combined c
  JOIN profiles p ON p.user_id = c.voyageur_id
  LEFT JOIN (
    SELECT rated_id, round(avg(score)::numeric, 1) AS avg_score, count(*) AS total
    FROM ratings
    GROUP BY rated_id
  ) r ON r.rated_id = c.voyageur_id
  ORDER BY c.weekly_deliveries DESC, average_score DESC
  LIMIT _limit;
$$;
