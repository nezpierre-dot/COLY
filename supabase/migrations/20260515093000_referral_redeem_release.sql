-- ============================================================================
-- Referral program backend wiring (V17)
--   1. redeem_referral(_code)        — RPC: a freshly-signed-up user attaches
--                                      themselves to a referrer via their code
--   2. award_points_on_referral()    — replaced: rewards BOTH referrer (+100)
--                                      and referred (+50) when a referral
--                                      reaches status 'completed'
--   3. release_referral_on_delivery  — trigger on shipments: the bonus is
--      release_referral_on_needit       released the first time the referred
--                                      user completes a real transaction
-- The `referrals` table + `profiles.referral_code` already exist
-- (see 20260308221119). This migration only adds the missing plumbing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. redeem_referral — called by the edge function `redeem-referral`
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _referrer uuid;
BEGIN
  IF _me IS NULL THEN
    RETURN 'unauthenticated';
  END IF;

  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN 'invalid_code';
  END IF;

  SELECT user_id INTO _referrer
  FROM public.profiles
  WHERE upper(referral_code) = upper(trim(_code))
  LIMIT 1;

  IF _referrer IS NULL THEN
    RETURN 'invalid_code';
  END IF;

  IF _referrer = _me THEN
    RETURN 'self_referral';
  END IF;

  -- referred_id is UNIQUE: a given user can only ever be referred once
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _me) THEN
    RETURN 'already_referred';
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, status)
  VALUES (_referrer, _me, 'pending');

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Reward both sides when a referral is validated (status -> 'completed').
--    Replaces the previous version which only awarded the referrer +15.
--    Trigger trg_award_points_referral (AFTER UPDATE ON referrals) stays bound.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_points_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    -- Referrer reward
    PERFORM public.award_points(NEW.referrer_id, 100, 'referral_validated', NEW.id);
    -- Referred-user welcome bonus
    PERFORM public.award_points(NEW.referred_id, 50, 'referral_welcome', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3a. Release the referral bonus on the referred user's first delivered colis
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_referral_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- The referred user can trigger the release either as the sender
    -- (user_id) or as the voyageur (voyageur_id) of this shipment.
    UPDATE public.referrals
    SET status = 'completed'
    WHERE status = 'pending'
      AND referred_id IN (NEW.user_id, NEW.voyageur_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_referral_on_delivery ON public.shipments;
CREATE TRIGGER trg_release_referral_on_delivery
  AFTER UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.release_referral_on_delivery();

-- ----------------------------------------------------------------------------
-- 3b. Same release path when the referred user completes a NeedIt mission
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_referral_on_needit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    UPDATE public.referrals
    SET status = 'completed'
    WHERE status = 'pending'
      AND referred_id IN (NEW.user_id, NEW.voyageur_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_referral_on_needit ON public.needit_missions;
CREATE TRIGGER trg_release_referral_on_needit
  AFTER UPDATE ON public.needit_missions
  FOR EACH ROW EXECUTE FUNCTION public.release_referral_on_needit();
