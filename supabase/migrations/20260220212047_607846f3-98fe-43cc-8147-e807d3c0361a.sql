
-- 1. Create secure role toggle function (prevents admin self-assignment)
CREATE OR REPLACE FUNCTION public.toggle_user_role(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_role app_role;
  _new_role app_role;
BEGIN
  -- Verify caller is the user themselves
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot change another user role';
  END IF;

  -- Get current role
  SELECT role INTO _current_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF _current_role IS NULL THEN
    RAISE EXCEPTION 'No role found for user';
  END IF;

  -- Only allow toggling between demandeur and voyageur
  IF _current_role = 'demandeur' THEN
    _new_role := 'voyageur';
  ELSIF _current_role = 'voyageur' THEN
    _new_role := 'demandeur';
  ELSE
    RAISE EXCEPTION 'Cannot change role from %', _current_role;
  END IF;

  -- Update the role
  UPDATE public.user_roles
  SET role = _new_role
  WHERE user_id = _user_id;

  RETURN _new_role::text;
END;
$$;

-- 2. Remove dangerous self-service INSERT/DELETE policies on user_roles
DROP POLICY IF EXISTS "Users can delete own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- 3. Add role validation to get_pending_shipments
CREATE OR REPLACE FUNCTION public.get_pending_shipments()
RETURNS TABLE(id uuid, ref_number text, departure_date date, departure_method text, departure_city text, arrival_city text, arrival_country text, size text, tarif text, insured boolean, is_international boolean, status text, photo_url text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only voyageurs can view pending shipments
  IF NOT public.has_role(auth.uid(), 'voyageur') THEN
    RAISE EXCEPTION 'Only voyageurs can access pending shipments';
  END IF;

  RETURN QUERY
  SELECT s.id,
         'COLY-' || upper(left(s.id::text, 8)) AS ref_number,
         s.departure_date, s.departure_method, s.departure_city,
         s.arrival_city, s.arrival_country, s.size, s.tarif, s.insured,
         s.is_international, s.status, s.photo_url, s.created_at
  FROM public.shipments s
  WHERE s.status = 'pending'
  ORDER BY s.created_at DESC;
END;
$$;

-- 4. Add role validation to get_pending_needit_missions
CREATE OR REPLACE FUNCTION public.get_pending_needit_missions()
RETURNS TABLE(id uuid, ref_number text, product_name text, category_path text[], country text, city text, prix_max text, poids text, dimension text, timing text, is_unlisted boolean, unlisted_description text, photo_url text, status text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only voyageurs can view pending needit missions
  IF NOT public.has_role(auth.uid(), 'voyageur') THEN
    RAISE EXCEPTION 'Only voyageurs can access pending missions';
  END IF;

  RETURN QUERY
  SELECT m.id,
         'NEED-' || upper(left(m.id::text, 8)) AS ref_number,
         m.product_name, m.category_path, m.country, m.city,
         m.prix_max, m.poids, m.dimension, m.timing,
         m.is_unlisted, m.unlisted_description, m.photo_url,
         m.status, m.created_at
  FROM public.needit_missions m
  WHERE m.status = 'pending'
  ORDER BY m.created_at DESC;
END;
$$;

-- 5. Make shipment-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'shipment-photos';

-- 6. Drop public read policy for shipment-photos
DROP POLICY IF EXISTS "Shipment photos are publicly readable" ON storage.objects;

-- 7. Create proper RLS policies for shipment-photos
CREATE POLICY "Shipment photo owners can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shipment-photos' AND
  auth.uid() IS NOT NULL
);
