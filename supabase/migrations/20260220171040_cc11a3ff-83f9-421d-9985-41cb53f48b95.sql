
-- Create voyages table
CREATE TABLE public.voyages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  departure_country text NOT NULL,
  departure_city text NOT NULL,
  departure_address text,
  departure_date date NOT NULL,
  departure_time text,
  arrival_country text NOT NULL,
  arrival_city text NOT NULL,
  arrival_address text,
  arrival_date date,
  arrival_time text,
  transport_method text NOT NULL,
  can_pickup boolean NOT NULL DEFAULT false,
  can_move boolean NOT NULL DEFAULT false,
  deliver_to_address boolean NOT NULL DEFAULT false,
  accept_needit boolean NOT NULL DEFAULT false,
  needit_budget text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voyages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own voyages"
  ON public.voyages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own voyages"
  ON public.voyages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own voyages"
  ON public.voyages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voyages"
  ON public.voyages FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_voyages_updated_at
  BEFORE UPDATE ON public.voyages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.voyages;
