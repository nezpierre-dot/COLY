
CREATE OR REPLACE FUNCTION public.admin_get_fraud_checks(_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  shipment_id uuid,
  user_id uuid,
  photo_url text,
  result text,
  confidence numeric,
  details text,
  created_at timestamp with time zone,
  reporter_name text,
  shipment_ref text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    fc.id,
    fc.shipment_id,
    fc.user_id,
    fc.photo_url,
    fc.result,
    fc.confidence,
    fc.details,
    fc.created_at,
    COALESCE(p.full_name, 'Anonyme') AS reporter_name,
    'COLY-' || upper(left(fc.shipment_id::text, 8)) AS shipment_ref
  FROM public.fraud_checks fc
  LEFT JOIN public.profiles p ON p.user_id = fc.user_id
  ORDER BY
    CASE fc.result WHEN 'fraudulent' THEN 0 WHEN 'suspicious' THEN 1 ELSE 2 END,
    fc.created_at DESC
  LIMIT _limit;
END;
$$;
