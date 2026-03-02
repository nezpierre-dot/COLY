
-- Table to store live GPS position of voyageurs during active missions
CREATE TABLE public.live_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shipment_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_sharing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, shipment_id)
);

-- Enable RLS
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Voyageur can manage own location
CREATE POLICY "Voyageur can insert own location"
  ON public.live_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Voyageur can update own location"
  ON public.live_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Voyageur can view own location"
  ON public.live_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Voyageur can delete own location"
  ON public.live_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Demandeur can view location for their shipments/missions
CREATE POLICY "Demandeur can view voyageur location for own shipments"
  ON public.live_locations FOR SELECT
  USING (
    shipment_id IN (
      SELECT id FROM public.shipments WHERE user_id = auth.uid()
    )
    OR
    shipment_id IN (
      SELECT id FROM public.needit_missions WHERE user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
