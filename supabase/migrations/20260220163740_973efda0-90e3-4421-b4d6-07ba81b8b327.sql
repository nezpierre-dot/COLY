
-- Create needit_missions table
CREATE TABLE public.needit_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  timing TEXT NOT NULL DEFAULT 'asap',
  category_path TEXT[] NOT NULL DEFAULT '{}',
  product_name TEXT,
  is_unlisted BOOLEAN NOT NULL DEFAULT false,
  unlisted_description TEXT,
  photo_url TEXT,
  dimension TEXT,
  poids TEXT,
  prix_max TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.needit_missions ENABLE ROW LEVEL SECURITY;

-- Creator can CRUD own missions
CREATE POLICY "Users can view own missions"
  ON public.needit_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own missions"
  ON public.needit_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON public.needit_missions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions"
  ON public.needit_missions FOR DELETE
  USING (auth.uid() = user_id);

-- Voyageurs can see pending missions (to pick them up)
CREATE POLICY "Voyageurs can view pending missions"
  ON public.needit_missions FOR SELECT
  USING (status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_needit_missions_updated_at
  BEFORE UPDATE ON public.needit_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.needit_missions;
