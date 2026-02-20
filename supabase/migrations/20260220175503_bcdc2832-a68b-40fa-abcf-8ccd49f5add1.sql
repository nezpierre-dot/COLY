
-- 1. Add 'admin' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Create admin stats function (SECURITY DEFINER with admin check)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_shipments', (SELECT count(*) FROM public.shipments),
    'pending_shipments', (SELECT count(*) FROM public.shipments WHERE status = 'pending'),
    'active_shipments', (SELECT count(*) FROM public.shipments WHERE status = 'accepted'),
    'total_voyages', (SELECT count(*) FROM public.voyages),
    'active_voyages', (SELECT count(*) FROM public.voyages WHERE status = 'active'),
    'total_needit', (SELECT count(*) FROM public.needit_missions),
    'pending_needit', (SELECT count(*) FROM public.needit_missions WHERE status = 'pending'),
    'total_demandeurs', (SELECT count(*) FROM public.user_roles WHERE role = 'demandeur'),
    'total_voyageurs', (SELECT count(*) FROM public.user_roles WHERE role = 'voyageur'),
    'kyc_pending', (SELECT count(*) FROM public.profiles WHERE kyc_status = 'pending'),
    'kyc_verified', (SELECT count(*) FROM public.profiles WHERE kyc_status = 'verified')
  ) INTO result;

  RETURN result;
END;
$$;

-- 3. Admin: get recent shipments (anonymized)
CREATE OR REPLACE FUNCTION public.admin_get_recent_shipments(_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  ref_number text,
  departure_city text,
  arrival_city text,
  arrival_country text,
  size text,
  tarif text,
  status text,
  insured boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT s.id,
         'COLY-' || upper(left(s.id::text, 8)),
         s.departure_city, s.arrival_city, s.arrival_country,
         s.size, s.tarif, s.status, s.insured, s.created_at
  FROM public.shipments s
  ORDER BY s.created_at DESC
  LIMIT _limit;
END;
$$;

-- 4. Admin: get shipments over time (for charts)
CREATE OR REPLACE FUNCTION public.admin_get_shipments_over_time()
RETURNS TABLE (
  day date,
  count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT s.created_at::date AS day, count(*) AS count
  FROM public.shipments s
  WHERE s.created_at >= now() - interval '30 days'
  GROUP BY s.created_at::date
  ORDER BY day;
END;
$$;

-- 5. Admin: get users over time (for charts)
CREATE OR REPLACE FUNCTION public.admin_get_users_over_time()
RETURNS TABLE (
  day date,
  count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.created_at::date AS day, count(*) AS count
  FROM public.profiles p
  WHERE p.created_at >= now() - interval '30 days'
  GROUP BY p.created_at::date
  ORDER BY day;
END;
$$;

-- 6. Admin: list users (anonymized profiles)
CREATE OR REPLACE FUNCTION public.admin_list_users(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  user_ref text,
  full_name text,
  kyc_status text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    'USR-' || upper(left(p.user_id::text, 8)) AS user_ref,
    p.full_name,
    p.kyc_status,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id LIMIT 1), 'demandeur') AS role,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;
