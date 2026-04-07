
-- 1. Admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_log_created ON public.admin_audit_log (created_at DESC);

-- 2. Update compute_user_level to read from platform_config dynamically
CREATE OR REPLACE FUNCTION public.compute_user_level(_points integer)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _thresholds jsonb;
  _diamant int;
  _platine int;
  _gold int;
  _green int;
BEGIN
  SELECT config_value INTO _thresholds
  FROM public.platform_config
  WHERE config_key = 'level_thresholds'
  LIMIT 1;

  IF _thresholds IS NOT NULL THEN
    _diamant := COALESCE((_thresholds->>'diamant')::int, 5000);
    _platine := COALESCE((_thresholds->>'platine')::int, 1500);
    _gold := COALESCE((_thresholds->>'gold')::int, 500);
    _green := COALESCE((_thresholds->>'green')::int, 100);
  ELSE
    _diamant := 5000;
    _platine := 1500;
    _gold := 500;
    _green := 100;
  END IF;

  RETURN CASE
    WHEN _points >= _diamant THEN 'diamant'
    WHEN _points >= _platine THEN 'platine'
    WHEN _points >= _gold THEN 'gold'
    ELSE 'green'
  END;
END;
$function$;

-- 3. Update award_points_on_delivery to read points from config
CREATE OR REPLACE FUNCTION public.award_points_on_delivery()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _points int;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' AND NEW.voyageur_id IS NOT NULL THEN
    SELECT COALESCE((config_value->>'shipment_delivered')::int, 10) INTO _points
    FROM public.platform_config WHERE config_key = 'points_per_action';
    IF _points IS NULL THEN _points := 10; END IF;
    PERFORM public.award_points(NEW.voyageur_id, _points, 'shipment_delivered', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Update award_points_on_needit_complete
CREATE OR REPLACE FUNCTION public.award_points_on_needit_complete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _points int;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' AND NEW.voyageur_id IS NOT NULL THEN
    SELECT COALESCE((config_value->>'needit_completed')::int, 10) INTO _points
    FROM public.platform_config WHERE config_key = 'points_per_action';
    IF _points IS NULL THEN _points := 10; END IF;
    PERFORM public.award_points(NEW.voyageur_id, _points, 'needit_completed', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Update award_points_on_good_rating
CREATE OR REPLACE FUNCTION public.award_points_on_good_rating()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _points int;
BEGIN
  IF NEW.score >= 4 THEN
    SELECT COALESCE((config_value->>'good_rating')::int, 5) INTO _points
    FROM public.platform_config WHERE config_key = 'points_per_action';
    IF _points IS NULL THEN _points := 5; END IF;
    PERFORM public.award_points(NEW.rated_id, _points, 'good_rating', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Update penalize_points_on_bad_rating
CREATE OR REPLACE FUNCTION public.penalize_points_on_bad_rating()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _penalty int;
BEGIN
  IF NEW.score <= 2 THEN
    SELECT COALESCE((config_value->>'bad_rating_penalty')::int, 5) INTO _penalty
    FROM public.platform_config WHERE config_key = 'points_per_action';
    IF _penalty IS NULL THEN _penalty := 5; END IF;
    PERFORM public.award_points(NEW.rated_id, -_penalty, 'bad_rating', NEW.id);
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.rated_id,
      '⚠️ Pénalité de points',
      'Vous avez perdu ' || _penalty || ' points suite à une note de ' || NEW.score || '★. Améliorez votre service pour regagner des points !',
      'points_penalty:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. Update award_points_on_referral
CREATE OR REPLACE FUNCTION public.award_points_on_referral()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _points int;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    SELECT COALESCE((config_value->>'referral_validated')::int, 15) INTO _points
    FROM public.platform_config WHERE config_key = 'points_per_action';
    IF _points IS NULL THEN _points := 15; END IF;
    PERFORM public.award_points(NEW.referrer_id, _points, 'referral_validated', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 8. Update admin_moderate_user to log actions
CREATE OR REPLACE FUNCTION public.admin_moderate_user(_target_user_id uuid, _action text, _reason text DEFAULT NULL)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Log the action
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), _action, 'user', _target_user_id::text, jsonb_build_object('reason', _reason));

  IF _action = 'suspend' THEN
    UPDATE public.profiles
    SET suspended_at = now(), suspension_reason = COALESCE(_reason, 'Suspended by admin')
    WHERE user_id = _target_user_id;
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '⛔ Compte suspendu', 'Votre compte a été suspendu. Raison : ' || COALESCE(_reason, 'Non spécifiée'), 'account_suspended');
    RETURN 'suspended';
  ELSIF _action = 'unsuspend' THEN
    UPDATE public.profiles SET suspended_at = NULL, suspension_reason = NULL WHERE user_id = _target_user_id;
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '✅ Compte rétabli', 'Votre compte a été rétabli. Merci de respecter les règles de la communauté.', 'account_restored');
    RETURN 'unsuspended';
  ELSIF _action = 'reset_points' THEN
    UPDATE public.user_points SET total_points = 0, level = 'green', updated_at = now() WHERE user_id = _target_user_id;
    INSERT INTO public.points_history (user_id, points, reason) VALUES (_target_user_id, 0, 'admin_reset');
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_target_user_id, '🔄 Points réinitialisés', 'Vos points ont été réinitialisés par un administrateur.', 'points_reset');
    RETURN 'points_reset';
  ELSE
    RAISE EXCEPTION 'Invalid action: %', _action;
  END IF;
END;
$function$;

-- 9. Seed points_per_action config if not exists
INSERT INTO public.platform_config (config_key, config_value, description)
VALUES ('points_per_action', '{"shipment_delivered": 10, "needit_completed": 10, "good_rating": 5, "bad_rating_penalty": 5, "referral_validated": 15}'::jsonb, 'Points attribués/retirés par type d''action')
ON CONFLICT (config_key) DO NOTHING;

-- 10. RPC to get audit log
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(_limit int DEFAULT 100)
  RETURNS TABLE(id uuid, admin_id uuid, admin_name text, action text, target_type text, target_id text, details jsonb, created_at timestamptz)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT a.id, a.admin_id, COALESCE(p.full_name, 'Admin') AS admin_name,
         a.action, a.target_type, a.target_id, a.details, a.created_at
  FROM public.admin_audit_log a
  LEFT JOIN public.profiles p ON p.user_id = a.admin_id
  ORDER BY a.created_at DESC
  LIMIT _limit;
END;
$function$;
