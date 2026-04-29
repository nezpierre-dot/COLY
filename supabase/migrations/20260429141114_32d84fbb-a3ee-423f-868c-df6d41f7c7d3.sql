CREATE TABLE IF NOT EXISTS public.web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  metric_name text NOT NULL,
  metric_value double precision NOT NULL,
  metric_rating text,
  metric_id text,
  navigation_type text,
  page_url text,
  user_agent text,
  device_type text,
  connection_type text
);

CREATE INDEX IF NOT EXISTS web_vitals_created_at_idx ON public.web_vitals(created_at DESC);
CREATE INDEX IF NOT EXISTS web_vitals_metric_idx ON public.web_vitals(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS web_vitals_user_idx ON public.web_vitals(user_id, created_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read web vitals"
  ON public.web_vitals
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own web vitals"
  ON public.web_vitals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());