
-- 1. user_points: remove user-facing INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;
DROP POLICY IF EXISTS "System can update points" ON public.user_points;

-- 2. points_history: remove user-facing INSERT
DROP POLICY IF EXISTS "System can insert points history" ON public.points_history;

-- 3. cancelled_matches_archive: validate ownership server-side
DROP POLICY IF EXISTS "Users can archive own cancellations" ON public.cancelled_matches_archive;

CREATE OR REPLACE FUNCTION public.archive_cancelled_match(
  _item_type text,
  _item_id text,
  _voyageur_id uuid,
  _departure_city text,
  _arrival_city text,
  _arrival_country text,
  _tarif text,
  _original_status text,
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ok boolean := false;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _item_type = 'shipment' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.shipments
      WHERE id = _item_id::uuid
        AND (user_id = _uid OR voyageur_id = _uid)
    ) INTO _ok;
  ELSIF _item_type = 'needit_mission' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.needit_missions
      WHERE id = _item_id::uuid
        AND (user_id = _uid OR voyageur_id = _uid)
    ) INTO _ok;
  ELSIF _item_type = 'voyage' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.voyages
      WHERE id = _item_id::uuid AND user_id = _uid
    ) INTO _ok;
  END IF;

  IF NOT _ok THEN
    RAISE EXCEPTION 'Not authorized to archive this item';
  END IF;

  INSERT INTO public.cancelled_matches_archive(
    item_type, item_id, user_id, voyageur_id,
    departure_city, arrival_city, arrival_country,
    tarif, original_status, reason
  ) VALUES (
    _item_type, _item_id, _uid, _voyageur_id,
    _departure_city, _arrival_city, _arrival_country,
    _tarif, _original_status, _reason
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_cancelled_match(text,text,uuid,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_cancelled_match(text,text,uuid,text,text,text,text,text,text) TO authenticated;

-- 4. voyages: drop broad SELECT exposing addresses
DROP POLICY IF EXISTS "Authenticated can view active voyages (use voyages_public for s" ON public.voyages;
DROP POLICY IF EXISTS "Authenticated can view active voyages" ON public.voyages;
DROP POLICY IF EXISTS "Authenticated can view active voyages (use voyages_public for sensitive cols)" ON public.voyages;

-- 5. storage: allow assigned voyageur to view shipment photos
DROP POLICY IF EXISTS "Voyageur can view assigned shipment photos" ON storage.objects;
CREATE POLICY "Voyageur can view assigned shipment photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipment-photos'
  AND EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.voyageur_id = auth.uid()
      AND (storage.foldername(name))[1] = s.user_id::text
  )
);
