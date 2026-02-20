
-- Tracking events table for shipment status history
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Users can view tracking events for their own shipments
CREATE POLICY "Users can view tracking for own shipments"
ON public.tracking_events
FOR SELECT
USING (
  shipment_id IN (SELECT id FROM public.shipments WHERE user_id = auth.uid())
  OR
  shipment_id IN (SELECT id FROM public.shipments WHERE voyageur_id = auth.uid())
);

-- Users can insert tracking events for shipments they're involved in
CREATE POLICY "Users can add tracking events"
ON public.tracking_events
FOR INSERT
WITH CHECK (
  shipment_id IN (SELECT id FROM public.shipments WHERE user_id = auth.uid())
  OR
  shipment_id IN (SELECT id FROM public.shipments WHERE voyageur_id = auth.uid())
);

-- Index for fast lookups
CREATE INDEX idx_tracking_events_shipment ON public.tracking_events(shipment_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;

-- Auto-create initial tracking event when a shipment is created
CREATE OR REPLACE FUNCTION public.create_initial_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tracking_events (shipment_id, status, label, description)
  VALUES (NEW.id, 'pending', 'Colis enregistré', 'Votre envoi a été créé et est en attente d''un voyageur');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_shipment_created
AFTER INSERT ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_tracking();

-- Auto-add tracking event when shipment status changes
CREATE OR REPLACE FUNCTION public.track_shipment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  _label TEXT;
  _desc TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN
        _label := 'Voyageur assigné';
        _desc := 'Un voyageur a accepté de transporter votre colis';
      WHEN 'picked_up' THEN
        _label := 'Colis récupéré';
        _desc := 'Le voyageur a récupéré votre colis';
      WHEN 'in_transit' THEN
        _label := 'En transit';
        _desc := 'Votre colis est en route vers sa destination';
      WHEN 'delivered' THEN
        _label := 'Livré';
        _desc := 'Votre colis a été livré avec succès';
      WHEN 'cancelled' THEN
        _label := 'Annulé';
        _desc := 'L''envoi a été annulé';
      ELSE
        _label := NEW.status;
        _desc := 'Statut mis à jour';
    END CASE;

    INSERT INTO public.tracking_events (shipment_id, status, label, description)
    VALUES (NEW.id, NEW.status, _label, _desc);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_shipment_status_change
AFTER UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.track_shipment_status_change();
