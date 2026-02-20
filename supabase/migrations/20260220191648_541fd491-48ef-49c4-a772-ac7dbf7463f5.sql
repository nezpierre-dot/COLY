
-- Add voyageur_id to needit_missions for acceptance tracking
ALTER TABLE public.needit_missions ADD COLUMN voyageur_id uuid;

-- Allow voyageurs to view missions they accepted
CREATE POLICY "Voyageurs can view accepted missions"
ON public.needit_missions
FOR SELECT
USING (auth.uid() = voyageur_id);

-- RPC: Accept a shipment (sets voyageur_id, status, creates conversation)
CREATE OR REPLACE FUNCTION public.accept_shipment(_shipment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
BEGIN
  -- Get shipment owner
  SELECT user_id INTO _demandeur_id
  FROM public.shipments
  WHERE id = _shipment_id AND status = 'pending';

  IF _demandeur_id IS NULL THEN
    RAISE EXCEPTION 'Shipment not found or not pending';
  END IF;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own shipment';
  END IF;

  -- Update shipment
  UPDATE public.shipments
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _shipment_id;

  -- Check if conversation already exists
  SELECT id INTO _convo_id
  FROM public.conversations
  WHERE shipment_id = _shipment_id AND demandeur_id = _demandeur_id AND voyageur_id = _voyageur_id;

  IF _convo_id IS NULL THEN
    INSERT INTO public.conversations (shipment_id, demandeur_id, voyageur_id)
    VALUES (_shipment_id, _demandeur_id, _voyageur_id)
    RETURNING id INTO _convo_id;

    -- Send initial system message
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_convo_id, _voyageur_id, '👋 Bonjour ! J''ai accepté de transporter votre colis. Coordonnons-nous ici.');
  END IF;

  RETURN _convo_id;
END;
$$;

-- RPC: Accept a NeedIt mission
CREATE OR REPLACE FUNCTION public.accept_needit_mission(_mission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
  _fake_shipment_id uuid;
BEGIN
  -- Get mission owner
  SELECT user_id INTO _demandeur_id
  FROM public.needit_missions
  WHERE id = _mission_id AND status = 'pending';

  IF _demandeur_id IS NULL THEN
    RAISE EXCEPTION 'Mission not found or not pending';
  END IF;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own mission';
  END IF;

  -- Update mission
  UPDATE public.needit_missions
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _mission_id;

  -- Use mission id as shipment_id for conversation (conversations require a shipment_id)
  -- We'll use the mission id directly
  SELECT id INTO _convo_id
  FROM public.conversations
  WHERE shipment_id = _mission_id AND demandeur_id = _demandeur_id AND voyageur_id = _voyageur_id;

  IF _convo_id IS NULL THEN
    INSERT INTO public.conversations (shipment_id, demandeur_id, voyageur_id)
    VALUES (_mission_id, _demandeur_id, _voyageur_id)
    RETURNING id INTO _convo_id;

    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_convo_id, _voyageur_id, '👋 Bonjour ! J''ai accepté votre mission NeedIt. Échangeons ici pour les détails.');
  END IF;

  RETURN _convo_id;
END;
$$;
