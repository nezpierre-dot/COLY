
-- Update award_points to clamp at 0 (prevent negative totals)
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _points integer, _reason text, _reference_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _new_total integer;
  _new_level text;
BEGIN
  -- Ensure user_points row exists
  INSERT INTO public.user_points (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update points (clamp at 0)
  UPDATE public.user_points
  SET total_points = GREATEST(0, total_points + _points),
      level = compute_user_level(GREATEST(0, total_points + _points)),
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING total_points, level INTO _new_total, _new_level;

  -- Record history
  INSERT INTO public.points_history (user_id, points, reason, reference_id)
  VALUES (_user_id, _points, _reason, _reference_id);
END;
$$;

-- Trigger: penalize on bad rating (≤2★) → -5 pts
CREATE OR REPLACE FUNCTION public.penalize_points_on_bad_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.score <= 2 THEN
    PERFORM public.award_points(NEW.rated_id, -5, 'bad_rating', NEW.id);

    -- Notify the user
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.rated_id,
      '⚠️ Pénalité de points',
      'Vous avez perdu 5 points suite à une note de ' || NEW.score || '★. Améliorez votre service pour regagner des points !',
      'points_penalty:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_penalize_bad_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.penalize_points_on_bad_rating();
