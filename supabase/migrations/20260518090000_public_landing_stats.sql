-- ============================================================================
-- public_landing_stats — RPC anon-callable pour alimenter le hero PublicLanding
-- en valeurs dynamiques (colis livrés, voyageurs vérifiés, note moyenne).
--
-- SECURITY DEFINER + GRANT anon, authenticated → contourne la RLS sur les
-- tables sous-jacentes pour exposer UNIQUEMENT des compteurs agrégés.
-- Aucune donnée individuelle ne fuit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.public_landing_stats()
RETURNS TABLE(
  total_delivered bigint,
  total_voyageurs_verified bigint,
  avg_rating numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::bigint FROM public.shipments WHERE status = 'delivered'),
    (SELECT COUNT(*)::bigint FROM public.profiles WHERE kyc_status IN ('verified', 'approved')),
    COALESCE(
      (SELECT ROUND(AVG(score)::numeric, 1) FROM public.ratings WHERE score IS NOT NULL),
      4.8
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_landing_stats() TO anon, authenticated;
