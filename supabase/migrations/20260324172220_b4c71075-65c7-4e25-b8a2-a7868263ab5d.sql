
-- Table for dispute satisfaction ratings
CREATE TABLE public.dispute_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (dispute_id, user_id)
);

ALTER TABLE public.dispute_ratings ENABLE ROW LEVEL SECURITY;

-- Users can rate disputes they're involved in
CREATE POLICY "Users can insert own dispute ratings"
  ON public.dispute_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own dispute ratings"
  ON public.dispute_ratings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all ratings
CREATE POLICY "Admins can view all dispute ratings"
  ON public.dispute_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DB function for admin dispute stats
CREATE OR REPLACE FUNCTION public.admin_get_dispute_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total', (SELECT count(*) FROM public.disputes),
    'open', (SELECT count(*) FROM public.disputes WHERE status = 'open'),
    'investigating', (SELECT count(*) FROM public.disputes WHERE status = 'investigating'),
    'resolved', (SELECT count(*) FROM public.disputes WHERE status IN ('resolved', 'refunded')),
    'avg_resolution_hours', (
      SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1), 0)
      FROM public.disputes WHERE status IN ('resolved', 'refunded')
    ),
    'avg_satisfaction', (
      SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0) FROM public.dispute_ratings
    ),
    'total_ratings', (
      SELECT count(*) FROM public.dispute_ratings
    )
  ) INTO result;

  RETURN result;
END;
$$;
