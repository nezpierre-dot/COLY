
CREATE OR REPLACE FUNCTION public.accept_shipment(_shipment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
  _shipment record;
  _msg text;
BEGIN
  SELECT user_id, departure_city, arrival_city, arrival_country, size, tarif, pickup_address, pickup_access_code
  INTO _shipment
  FROM public.shipments
  WHERE id = _shipment_id AND status = 'pending';

  _demandeur_id := _shipment.user_id;

  IF _demandeur_id IS NULL THEN
    RAISE EXCEPTION 'Shipment not found or not pending';
  END IF;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own shipment';
  END IF;

  UPDATE public.shipments
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _shipment_id;

  _msg := E'👋 Bonjour ! J''ai accepté de transporter votre colis.\n\n';
  _msg := _msg || '📦 Trajet : ' || COALESCE(_shipment.departure_city, '—') || ' → ' || _shipment.arrival_city || ' (' || _shipment.arrival_country || E')\n';
  _msg := _msg || 'Taille : ' || _shipment.size || ' — Tarif : ' || _shipment.tarif || E'\n';

  IF _shipment.pickup_address IS NOT NULL THEN
    _msg := _msg || E'\n📍 Adresse de récupération : ' || _shipment.pickup_address;
    IF _shipment.pickup_access_code IS NOT NULL THEN
      _msg := _msg || E'\n🔑 Code d''accès : ' || _shipment.pickup_access_code;
    END IF;
    _msg := _msg || E'\n';
  END IF;

  _msg := _msg || E'\nCoordonnons-nous ici. 🚀\n\n';
  _msg := _msg || '→ __LINK__:shipment-detail:' || _shipment_id::text;

  SELECT id INTO _convo_id
  FROM public.conversations
  WHERE shipment_id = _shipment_id AND demandeur_id = _demandeur_id AND voyageur_id = _voyageur_id;

  IF _convo_id IS NULL THEN
    INSERT INTO public.conversations (shipment_id, demandeur_id, voyageur_id)
    VALUES (_shipment_id, _demandeur_id, _voyageur_id)
    RETURNING id INTO _convo_id;

    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_convo_id, _voyageur_id, _msg);
  END IF;

  RETURN _convo_id;
END;
$function$
