
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
  _voyageur_name text;
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

  -- Get voyageur name for notification
  SELECT COALESCE(full_name, 'Un voyageur') INTO _voyageur_name
  FROM public.profiles WHERE user_id = _voyageur_id;

  -- Notify the demandeur
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _demandeur_id,
    'Colis accepté ✅',
    _voyageur_name || ' a accepté de transporter votre colis ' || COALESCE(_shipment.departure_city, '') || ' → ' || _shipment.arrival_city || '.',
    'accepted:shipment:' || _shipment_id::text
  );

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
$function$;

CREATE OR REPLACE FUNCTION public.accept_needit_mission(_mission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
  _mission record;
  _voyage record;
  _msg text;
  _voyageur_name text;
BEGIN
  SELECT user_id, product_name, prix_max, country, city, pickup_address, pickup_access_code
  INTO _mission
  FROM public.needit_missions
  WHERE id = _mission_id AND status = 'pending';

  _demandeur_id := _mission.user_id;

  IF _demandeur_id IS NULL THEN
    RAISE EXCEPTION 'Mission not found or not pending';
  END IF;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own mission';
  END IF;

  UPDATE public.needit_missions
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _mission_id;

  -- Get voyageur name for notification
  SELECT COALESCE(full_name, 'Un voyageur') INTO _voyageur_name
  FROM public.profiles WHERE user_id = _voyageur_id;

  -- Notify the demandeur
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _demandeur_id,
    'Mission NeedIt acceptée ✅',
    _voyageur_name || ' a accepté votre mission pour ' || COALESCE(_mission.product_name, 'votre produit') || '.',
    'accepted:needit:' || _mission_id::text
  );

  SELECT departure_city, departure_date
  INTO _voyage
  FROM public.voyages
  WHERE user_id = _voyageur_id AND status = 'active'
  ORDER BY departure_date ASC
  LIMIT 1;

  _msg := E'✅ J''ai accepté ta mission NeedIt !\n\n';
  _msg := _msg || 'Produit : ' || COALESCE(_mission.product_name, 'Non spécifié') || E'\n';
  IF _mission.prix_max IS NOT NULL THEN
    _msg := _msg || 'Budget max : ' || _mission.prix_max || E' €\n';
  END IF;
  IF _voyage.departure_city IS NOT NULL THEN
    _msg := _msg || 'Je vais récupérer le colis à ' || _voyage.departure_city;
    IF _voyage.departure_date IS NOT NULL THEN
      _msg := _msg || ' le ' || to_char(_voyage.departure_date, 'DD/MM/YYYY');
    END IF;
    _msg := _msg || E'\n';
  END IF;
  IF _mission.pickup_address IS NOT NULL THEN
    _msg := _msg || E'\n📍 Adresse de récupération : ' || _mission.pickup_address;
    IF _mission.pickup_access_code IS NOT NULL THEN
      _msg := _msg || E'\n🔑 Code d''accès : ' || _mission.pickup_access_code;
    END IF;
    _msg := _msg || E'\n';
  END IF;
  _msg := _msg || E'\nJe te tiendrai au courant dès que j''ai le colis en main.\n\n';
  _msg := _msg || '→ __LINK__:needit-detail:' || _mission_id::text;

  SELECT id INTO _convo_id
  FROM public.conversations
  WHERE shipment_id = _mission_id AND demandeur_id = _demandeur_id AND voyageur_id = _voyageur_id;

  IF _convo_id IS NULL THEN
    INSERT INTO public.conversations (shipment_id, demandeur_id, voyageur_id)
    VALUES (_mission_id, _demandeur_id, _voyageur_id)
    RETURNING id INTO _convo_id;

    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_convo_id, _voyageur_id, _msg);

    INSERT INTO public.messages (conversation_id, sender_id, content, created_at)
    VALUES (
      _convo_id,
      _demandeur_id,
      E'📸 Merci ! Peux-tu envoyer une photo du produit acheté + le ticket de caisse ?\n\nUtilise le bouton "Envoyer preuve" ci-dessous.',
      now() + interval '2 seconds'
    );
  END IF;

  RETURN _convo_id;
END;
$function$;
