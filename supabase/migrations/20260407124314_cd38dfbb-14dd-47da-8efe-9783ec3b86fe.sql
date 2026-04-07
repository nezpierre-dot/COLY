
-- Create user_points table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'green',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- RLS: users can view own points
CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: authenticated users can view any user's badge (public profile)
CREATE POLICY "Anyone can view user badges"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (true);

-- RLS: users can insert own points row
CREATE POLICY "Users can insert own points"
  ON public.user_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: users can update own points (via trigger only in practice)
CREATE POLICY "System can update points"
  ON public.user_points FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create points_history table for audit trail
CREATE TABLE public.points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points history"
  ON public.points_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points history"
  ON public.points_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to compute level from points
CREATE OR REPLACE FUNCTION public.compute_user_level(_points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _points >= 5000 THEN 'diamant'
    WHEN _points >= 1500 THEN 'platine'
    WHEN _points >= 500 THEN 'gold'
    WHEN _points >= 100 THEN 'green'
    ELSE 'green'
  END;
$$;

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _points integer, _reason text, _reference_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_total integer;
  _new_level text;
  _old_level text;
BEGIN
  -- Ensure user_points row exists
  INSERT INTO public.user_points (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update points
  UPDATE public.user_points
  SET total_points = total_points + _points,
      level = compute_user_level(total_points + _points),
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING total_points, level INTO _new_total, _new_level;

  -- Record history
  INSERT INTO public.points_history (user_id, points, reason, reference_id)
  VALUES (_user_id, _points, _reason, _reference_id);
END;
$$;

-- Trigger: award 10 pts on shipment delivered
CREATE OR REPLACE FUNCTION public.award_points_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' AND NEW.voyageur_id IS NOT NULL THEN
    PERFORM public.award_points(NEW.voyageur_id, 10, 'shipment_delivered', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_points_delivery
  AFTER UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_delivery();

-- Trigger: award 10 pts on needit mission completed
CREATE OR REPLACE FUNCTION public.award_points_on_needit_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' AND NEW.voyageur_id IS NOT NULL THEN
    PERFORM public.award_points(NEW.voyageur_id, 10, 'needit_completed', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_points_needit
  AFTER UPDATE ON public.needit_missions
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_needit_complete();

-- Trigger: award 5 pts on good rating received (score >= 4)
CREATE OR REPLACE FUNCTION public.award_points_on_good_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.score >= 4 THEN
    PERFORM public.award_points(NEW.rated_id, 5, 'good_rating', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_points_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_good_rating();

-- Trigger: award 15 pts on referral validated
CREATE OR REPLACE FUNCTION public.award_points_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    PERFORM public.award_points(NEW.referrer_id, 15, 'referral_validated', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_points_referral
  AFTER UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_referral();

-- Auto-create user_points row when profile is created
CREATE OR REPLACE FUNCTION public.auto_create_user_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_points (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_user_points
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_user_points();
