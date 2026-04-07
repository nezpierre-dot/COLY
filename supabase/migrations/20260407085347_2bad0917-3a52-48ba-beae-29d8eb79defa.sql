
CREATE TABLE public.favorite_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT,
  address TEXT NOT NULL,
  access_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorite addresses" ON public.favorite_addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorite addresses" ON public.favorite_addresses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite addresses" ON public.favorite_addresses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
