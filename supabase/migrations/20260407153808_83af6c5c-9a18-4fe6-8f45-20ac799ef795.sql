
-- 1. Drop existing functions to change signature
DROP FUNCTION IF EXISTS public.accept_shipment(uuid);
DROP FUNCTION IF EXISTS public.accept_needit_mission(uuid);

-- 2. Anti-doublon: accept_shipment with FOR UPDATE lock
CREATE OR REPLACE FUNCTION public.accept_shipment(_shipment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
  _shipment record;
  _msg text;
  _voyageur_ref text;
BEGIN
  SELECT user_id, departure_city, arrival_city, arrival_country, size, tarif, pickup_address, pickup_access_code, voyageur_id, status
  INTO _shipment
  FROM public.shipments
  WHERE id = _shipment_id
  FOR UPDATE;

  IF _shipment IS NULL THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  IF _shipment.status != 'pending' THEN
    RAISE EXCEPTION 'Ce colis n''est plus disponible (statut: %)', _shipment.status;
  END IF;

  IF _shipment.voyageur_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ce colis a déjà été accepté par un autre voyageur';
  END IF;

  _demandeur_id := _shipment.user_id;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own shipment';
  END IF;

  UPDATE public.shipments
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _shipment_id;

  _voyageur_ref := 'VOY-' || upper(left(_voyageur_id::text, 8));

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _demandeur_id,
    'Colis accepté ✅',
    _voyageur_ref || ' a accepté de transporter votre colis ' || COALESCE(_shipment.departure_city, '') || ' → ' || _shipment.arrival_city || '.',
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
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (_convo_id, _voyageur_id, _msg);

  INSERT INTO public.tracking_events (shipment_id, status, label)
  VALUES (_shipment_id, 'accepted', 'Colis accepté par un voyageur');

  RETURN _convo_id;
END;
$$;

-- 3. Anti-doublon: accept_needit_mission with FOR UPDATE lock
CREATE OR REPLACE FUNCTION public.accept_needit_mission(_mission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _demandeur_id uuid;
  _voyageur_id uuid := auth.uid();
  _convo_id uuid;
  _mission record;
  _voyage record;
  _msg text;
  _voyageur_ref text;
BEGIN
  SELECT user_id, product_name, prix_max, country, city, pickup_address, pickup_access_code, voyageur_id, status
  INTO _mission
  FROM public.needit_missions
  WHERE id = _mission_id
  FOR UPDATE;

  IF _mission IS NULL THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;

  IF _mission.status != 'pending' THEN
    RAISE EXCEPTION 'Cette mission n''est plus disponible (statut: %)', _mission.status;
  END IF;

  IF _mission.voyageur_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cette mission a déjà été acceptée par un autre voyageur';
  END IF;

  _demandeur_id := _mission.user_id;

  IF _demandeur_id = _voyageur_id THEN
    RAISE EXCEPTION 'Cannot accept your own mission';
  END IF;

  UPDATE public.needit_missions
  SET voyageur_id = _voyageur_id, status = 'accepted'
  WHERE id = _mission_id;

  _voyageur_ref := 'VOY-' || upper(left(_voyageur_id::text, 8));

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _demandeur_id,
    'Mission NeedIt acceptée ✅',
    _voyageur_ref || ' a accepté votre mission pour ' || COALESCE(_mission.product_name, 'votre produit') || '.',
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
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (_convo_id, _voyageur_id, _msg);

  RETURN _convo_id;
END;
$$;

-- 4. Improved matching with trust score + hour + capacity check
CREATE OR REPLACE FUNCTION public.get_matching_voyageurs(
  _destination_country text,
  _destination_city text DEFAULT NULL,
  _departure_date date DEFAULT NULL,
  _max_weight_kg numeric DEFAULT NULL,
  _limit integer DEFAULT 10
)
RETURNS TABLE(
  voyageur_id uuid,
  full_name text,
  avatar_url text,
  departure_city text,
  departure_country text,
  arrival_city text,
  arrival_country text,
  departure_date date,
  transport_method text,
  max_weight_kg numeric,
  max_items integer,
  average_score numeric,
  total_ratings bigint,
  voyage_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.user_id AS voyageur_id,
    p.full_name,
    p.avatar_url,
    v.departure_city,
    v.departure_country,
    v.arrival_city,
    v.arrival_country,
    v.departure_date,
    v.transport_method,
    v.max_weight_kg,
    v.max_items,
    COALESCE(r.avg_score, 0) AS average_score,
    COALESCE(r.cnt, 0) AS total_ratings,
    v.id AS voyage_id
  FROM public.voyages v
  INNER JOIN public.profiles p ON p.user_id = v.user_id
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(rat.score)::numeric, 1) AS avg_score, COUNT(*) AS cnt
    FROM public.ratings rat
    WHERE rat.rated_id = v.user_id
  ) r ON true
  WHERE v.status = 'active'
    AND v.departure_date >= CURRENT_DATE
    AND (v.departure_date + COALESCE(v.departure_time, '00:00')::time) > (now() + (COALESCE(v.cutoff_hours, 24) || ' hours')::interval)
    AND lower(v.arrival_country) = lower(_destination_country)
    AND (_destination_city IS NULL OR _destination_city = '' OR lower(v.arrival_city) = lower(_destination_city))
    AND (_max_weight_kg IS NULL OR v.max_weight_kg IS NULL OR v.max_weight_kg >= _max_weight_kg)
    AND v.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    -- Capacity check: exclude voyageurs at max items
    AND (v.max_items IS NULL OR (
      (SELECT COUNT(*) FROM public.shipments s
       WHERE s.voyageur_id = v.user_id AND s.status IN ('accepted','picked_up','in_transit')
         AND lower(s.arrival_country) = lower(v.arrival_country)
         AND s.departure_date = v.departure_date)
      +
      (SELECT COUNT(*) FROM public.needit_missions m
       WHERE m.voyageur_id = v.user_id AND m.status IN ('accepted','picked_up','in_transit')
         AND lower(m.country) = lower(v.arrival_country))
    ) < v.max_items)
  ORDER BY
    -- 1. Exact city match
    CASE WHEN _destination_city IS NOT NULL AND lower(v.arrival_city) = lower(_destination_city) THEN 0 ELSE 1 END ASC,
    -- 2. Exact date match
    CASE WHEN _departure_date IS NOT NULL AND v.departure_date = _departure_date THEN 0 ELSE 1 END ASC,
    -- 3. Trust score
    (
      CASE WHEN p.kyc_status = 'verified' THEN 3 ELSE 0 END
      + COALESCE(array_length(p.trust_badges, 1), 0)
      + CASE WHEN COALESCE(r.avg_score, 0) >= 4.8 THEN 2 ELSE 0 END
      + CASE WHEN COALESCE(r.cnt, 0) >= 10 THEN 1 ELSE 0 END
    ) DESC,
    -- 4. Rating
    COALESCE(r.avg_score, 0) DESC,
    -- 5. Date proximity
    CASE WHEN _departure_date IS NOT NULL
      THEN ABS(v.departure_date - _departure_date)
      ELSE 0
    END ASC,
    -- 6. Number of ratings
    COALESCE(r.cnt, 0) DESC,
    -- 7. Soonest departure + time
    v.departure_date ASC,
    (COALESCE(v.departure_time, '00:00')::time) ASC
  LIMIT _limit;
END;
$$;
