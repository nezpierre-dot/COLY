-- Rate limits table (per user_id + action, sliding window)
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, action, window_start)
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (user_id, action, window_start DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view rate limits"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Atomic check + increment. Returns true if allowed, false if blocked.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _action text,
  _max_requests integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _window_bucket timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Bucket = floor(now / window) * window
  _window_bucket := to_timestamp(
    floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds
  );

  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (_user_id, _action, _window_bucket, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO _current_count;

  -- Cleanup old buckets occasionally
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
    WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN _current_count <= _max_requests;
END;
$$;

-- Client error logs
CREATE TABLE public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  route text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_errors_created ON public.client_errors (created_at DESC);
CREATE INDEX idx_client_errors_user ON public.client_errors (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view client errors"
  ON public.client_errors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserts are done via edge function with service role; deny direct client inserts
CREATE POLICY "No direct insert"
  ON public.client_errors FOR INSERT TO public
  WITH CHECK (false);