
-- Add defensive auth.uid() checks to trigger functions

-- 1. create_initial_tracking - fires on shipment INSERT, user must be authenticated
CREATE OR REPLACE FUNCTION public.create_initial_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Defensive check: only authenticated users should create shipments
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated access not allowed';
  END IF;

  INSERT INTO public.tracking_events (shipment_id, status, label, description)
  VALUES (NEW.id, 'pending', 'Colis enregistré', 'Votre envoi a été créé et est en attente d''un voyageur');
  RETURN NEW;
END;
$function$;

-- 2. track_shipment_status_change - fires on shipment UPDATE
CREATE OR REPLACE FUNCTION public.track_shipment_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _label TEXT;
  _desc TEXT;
BEGIN
  -- Defensive check: only authenticated users should update shipments
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated access not allowed';
  END IF;

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
$function$;

-- 3. update_conversation_last_message - fires on message INSERT
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Defensive check: only authenticated users should send messages
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated access not allowed';
  END IF;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;
