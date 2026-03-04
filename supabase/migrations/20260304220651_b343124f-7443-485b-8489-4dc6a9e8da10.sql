
-- 1. Pickup proofs table
CREATE TABLE public.pickup_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  photo_url text NOT NULL,
  latitude double precision,
  longitude double precision,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voyageur can insert pickup proof"
  ON public.pickup_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
  );

CREATE POLICY "Involved parties can view pickup proof"
  ON public.pickup_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipments WHERE shipments.id = pickup_proofs.shipment_id
        AND (shipments.user_id = auth.uid() OR shipments.voyageur_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM needit_missions WHERE needit_missions.id = pickup_proofs.shipment_id
        AND (needit_missions.user_id = auth.uid() OR needit_missions.voyageur_id = auth.uid())
    )
  );

-- 2. Add confirmation_code to shipments and needit_missions
ALTER TABLE public.shipments ADD COLUMN confirmation_code text;
ALTER TABLE public.needit_missions ADD COLUMN confirmation_code text;

-- 3. Function to generate a 6-digit confirmation code
CREATE OR REPLACE FUNCTION public.generate_confirmation_code(_item_id uuid, _item_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
BEGIN
  -- Generate random 6-char alphanumeric code
  _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  
  IF _item_type = 'shipment' THEN
    UPDATE public.shipments SET confirmation_code = _code WHERE id = _item_id;
  ELSIF _item_type = 'needit_mission' THEN
    UPDATE public.needit_missions SET confirmation_code = _code WHERE id = _item_id;
  ELSE
    RAISE EXCEPTION 'Invalid item type';
  END IF;
  
  RETURN _code;
END;
$$;

-- 4. Function to validate confirmation code and finalize
CREATE OR REPLACE FUNCTION public.validate_confirmation_code(_item_id uuid, _item_type text, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stored_code text;
  _voyageur_id uuid;
BEGIN
  IF _item_type = 'shipment' THEN
    SELECT confirmation_code, voyageur_id INTO _stored_code, _voyageur_id
    FROM public.shipments WHERE id = _item_id;
    
    IF _stored_code IS NULL OR upper(_stored_code) != upper(_code) THEN
      RETURN false;
    END IF;
    
    IF auth.uid() != _voyageur_id THEN
      RAISE EXCEPTION 'Only the assigned voyageur can validate';
    END IF;
    
    UPDATE public.shipments SET status = 'delivered', confirmation_code = NULL WHERE id = _item_id;
    RETURN true;
    
  ELSIF _item_type = 'needit_mission' THEN
    SELECT confirmation_code, voyageur_id INTO _stored_code, _voyageur_id
    FROM public.needit_missions WHERE id = _item_id;
    
    IF _stored_code IS NULL OR upper(_stored_code) != upper(_code) THEN
      RETURN false;
    END IF;
    
    IF auth.uid() != _voyageur_id THEN
      RAISE EXCEPTION 'Only the assigned voyageur can validate';
    END IF;
    
    UPDATE public.needit_missions SET status = 'completed', confirmation_code = NULL WHERE id = _item_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 5. Function to create pickup notification
CREATE OR REPLACE FUNCTION public.notify_pickup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _product_name text;
BEGIN
  -- Try shipment first
  SELECT user_id INTO _owner_id FROM public.shipments WHERE id = NEW.shipment_id;
  
  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_owner_id, 'Colis récupéré ✅', 'Le voyageur a récupéré votre colis et a fourni une preuve photo.', 'pickup');
  ELSE
    -- Try needit mission
    SELECT user_id, product_name INTO _owner_id, _product_name FROM public.needit_missions WHERE id = NEW.shipment_id;
    IF _owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_owner_id, 'Produit récupéré ✅', 'Le voyageur a récupéré votre produit ' || COALESCE(_product_name, '') || ' et a fourni une preuve photo.', 'pickup');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pickup_proof_inserted
  AFTER INSERT ON public.pickup_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pickup();

-- Enable realtime for pickup_proofs
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_proofs;
