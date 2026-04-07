
CREATE TABLE public.cancelled_matches_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  voyageur_id UUID,
  departure_city TEXT,
  arrival_city TEXT,
  arrival_country TEXT,
  tarif TEXT,
  original_status TEXT,
  reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cancelled_matches_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cancelled matches archive"
  ON public.cancelled_matches_archive
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert archive"
  ON public.cancelled_matches_archive
  FOR INSERT
  WITH CHECK (true);
