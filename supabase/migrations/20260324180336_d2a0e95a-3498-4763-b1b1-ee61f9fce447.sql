
CREATE TABLE public.rating_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (rating_id)
);

ALTER TABLE public.rating_replies ENABLE ROW LEVEL SECURITY;

-- Users can read replies on their own ratings or replies they wrote
CREATE POLICY "Users can read relevant replies"
ON public.rating_replies
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR rating_id IN (SELECT id FROM public.ratings WHERE rated_id = auth.uid())
  OR rating_id IN (SELECT id FROM public.ratings WHERE rater_id = auth.uid())
);

-- Users can insert a reply only on ratings where they are the rated person (1 reply per rating)
CREATE POLICY "Rated user can reply"
ON public.rating_replies
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND rating_id IN (SELECT id FROM public.ratings WHERE rated_id = auth.uid())
);

-- Users can update their own replies
CREATE POLICY "Users can update own replies"
ON public.rating_replies
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
