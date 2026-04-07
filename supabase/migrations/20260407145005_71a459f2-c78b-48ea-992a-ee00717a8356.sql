
-- Platform config table
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config" ON public.platform_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update config" ON public.platform_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert config" ON public.platform_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default configs
INSERT INTO public.platform_config (config_key, config_value, description) VALUES
  ('points_per_delivery', '10', 'Points gagnés par livraison de colis'),
  ('points_per_needit', '10', 'Points gagnés par mission NeedIt complétée'),
  ('points_per_good_rating', '5', 'Points gagnés pour une note ≥4★'),
  ('points_per_referral', '15', 'Points gagnés par parrainage validé'),
  ('points_penalty_bad_rating', '-5', 'Points retirés pour une note ≤2★'),
  ('level_thresholds', '{"green": 0, "gold": 100, "platine": 500, "diamant": 1500}', 'Seuils de points par niveau'),
  ('commission_rates', '{"green": 15, "gold": 15, "platine": 10, "diamant": 5}', 'Taux de commission (%) par niveau'),
  ('notifications_enabled', '{"email_reminders": true, "push_reminders": true, "rating_reminders": true}', 'Paramètres de notifications automatiques')
ON CONFLICT (config_key) DO NOTHING;

-- Add suspended_at to profiles for moderation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Level distribution stats
CREATE OR REPLACE FUNCTION public.admin_get_level_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'by_level', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT level, count(*) as user_count, sum(total_points) as total_points
        FROM public.user_points
        GROUP BY level
        ORDER BY CASE level WHEN 'diamant' THEN 0 WHEN 'platine' THEN 1 WHEN 'gold' THEN 2 ELSE 3 END
      ) t
    ),
    'total_points_distributed', (SELECT COALESCE(sum(points), 0) FROM public.points_history WHERE points > 0),
    'total_penalties', (SELECT COALESCE(sum(abs(points)), 0) FROM public.points_history WHERE points < 0),
    'penalty_count', (SELECT count(*) FROM public.points_history WHERE points < 0),
    'avg_points', (SELECT COALESCE(round(avg(total_points)::numeric, 0), 0) FROM public.user_points)
  ) INTO result;

  RETURN result;
END;
$$;

-- Conversion stats
CREATE OR REPLACE FUNCTION public.admin_get_conversion_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'shipments', json_build_object(
      'total', (SELECT count(*) FROM public.shipments),
      'pending', (SELECT count(*) FROM public.shipments WHERE status = 'pending'),
      'accepted', (SELECT count(*) FROM public.shipments WHERE status = 'accepted'),
      'delivered', (SELECT count(*) FROM public.shipments WHERE status = 'delivered'),
      'cancelled', (SELECT count(*) FROM public.shipments WHERE status = 'cancelled'),
      'avg_match_hours', (
        SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (
          (SELECT min(te.created_at) FROM public.tracking_events te WHERE te.shipment_id = s.id AND te.status = 'accepted')
          - s.created_at
        )) / 3600)::numeric, 1), 0)
        FROM public.shipments s WHERE s.status IN ('accepted', 'delivered')
      )
    ),
    'missions', json_build_object(
      'total', (SELECT count(*) FROM public.needit_missions),
      'pending', (SELECT count(*) FROM public.needit_missions WHERE status = 'pending'),
      'accepted', (SELECT count(*) FROM public.needit_missions WHERE status = 'accepted'),
      'completed', (SELECT count(*) FROM public.needit_missions WHERE status = 'completed'),
      'cancelled', (SELECT count(*) FROM public.needit_missions WHERE status = 'cancelled')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Revenue stats
CREATE OR REPLACE FUNCTION public.admin_get_revenue_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_revenue', (
      SELECT COALESCE(sum(
        CASE WHEN tarif ~ '^\d+(\.\d+)?$' THEN tarif::numeric ELSE 0 END
      ), 0)
      FROM public.shipments WHERE status = 'delivered'
    ),
    'total_commission', (
      SELECT COALESCE(round(sum(
        CASE WHEN tarif ~ '^\d+(\.\d+)?$' THEN tarif::numeric * 0.15 ELSE 0 END
      )::numeric, 2), 0)
      FROM public.shipments WHERE status = 'delivered'
    ),
    'monthly_revenue', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          to_char(date_trunc('month', updated_at), 'YYYY-MM') as month,
          COALESCE(sum(CASE WHEN tarif ~ '^\d+(\.\d+)?$' THEN tarif::numeric ELSE 0 END), 0) as revenue,
          count(*) as deliveries
        FROM public.shipments WHERE status = 'delivered'
        GROUP BY date_trunc('month', updated_at)
        ORDER BY month DESC
        LIMIT 12
      ) t
    ),
    'top_voyageurs', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          s.voyageur_id,
          p.full_name,
          count(*) as deliveries,
          COALESCE(sum(CASE WHEN s.tarif ~ '^\d+(\.\d+)?$' THEN s.tarif::numeric ELSE 0 END), 0) as total_earned
        FROM public.shipments s
        JOIN public.profiles p ON p.user_id = s.voyageur_id
        WHERE s.status = 'delivered' AND s.voyageur_id IS NOT NULL
        GROUP BY s.voyageur_id, p.full_name
        ORDER BY total_earned DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Geo stats
CREATE OR REPLACE FUNCTION public.admin_get_geo_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'top_routes', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          departure_city,
          arrival_city,
          arrival_country,
          count(*) as shipment_count
        FROM public.shipments
        WHERE departure_city IS NOT NULL
        GROUP BY departure_city, arrival_city, arrival_country
        ORDER BY shipment_count DESC
        LIMIT 15
      ) t
    ),
    'top_countries', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT arrival_country, count(*) as count
        FROM public.shipments
        GROUP BY arrival_country
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'active_voyages_by_country', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT arrival_country, count(*) as count
        FROM public.voyages
        WHERE status = 'active'
        GROUP BY arrival_country
        ORDER BY count DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Admin moderation function
CREATE OR REPLACE FUNCTION public.admin_moderate_user(_target_user_id uuid, _action text, _reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _action = 'suspend' THEN
    UPDATE public.profiles
    SET suspended_at = now(), suspension_reason = COALESCE(_reason, 'Suspended by admin')
    WHERE user_id = _target_user_id;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '⛔ Compte suspendu', 'Votre compte a été suspendu. Raison : ' || COALESCE(_reason, 'Non spécifiée'), 'account_suspended');
    
    RETURN 'suspended';
    
  ELSIF _action = 'unsuspend' THEN
    UPDATE public.profiles
    SET suspended_at = NULL, suspension_reason = NULL
    WHERE user_id = _target_user_id;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '✅ Compte rétabli', 'Votre compte a été rétabli. Merci de respecter les règles de la communauté.', 'account_restored');
    
    RETURN 'unsuspended';
    
  ELSIF _action = 'reset_points' THEN
    UPDATE public.user_points
    SET total_points = 0, level = 'green', updated_at = now()
    WHERE user_id = _target_user_id;
    
    INSERT INTO public.points_history (user_id, points, reason)
    VALUES (_target_user_id, 0, 'admin_reset');
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '🔄 Points réinitialisés', 'Vos points ont été réinitialisés par un administrateur.', 'points_reset');
    
    RETURN 'points_reset';
    
  ELSE
    RAISE EXCEPTION 'Invalid action: %', _action;
  END IF;
END;
$$;
