
-- Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  bonus_amount numeric NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.user_id::text || clock_timestamp()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles with referral codes
UPDATE public.profiles SET referral_code = upper(substr(md5(user_id::text || now()::text || id::text), 1, 8))
WHERE referral_code IS NULL;

-- Add trust badge columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_badges text[] NOT NULL DEFAULT '{}';

-- Function to compute trust badges
CREATE OR REPLACE FUNCTION public.compute_trust_badges(_user_id uuid)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _badges text[] := '{}';
  _kyc text;
  _avg_score numeric;
  _total_ratings bigint;
  _delivered_count bigint;
BEGIN
  SELECT kyc_status INTO _kyc FROM public.profiles WHERE user_id = _user_id;
  
  SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0), COUNT(*)
  INTO _avg_score, _total_ratings
  FROM public.ratings WHERE rated_id = _user_id;
  
  SELECT COUNT(*) INTO _delivered_count
  FROM public.shipments WHERE voyageur_id = _user_id AND status = 'delivered';
  
  IF _kyc = 'verified' THEN _badges := array_append(_badges, 'verified'); END IF;
  IF _avg_score >= 4.8 AND _total_ratings >= 5 THEN _badges := array_append(_badges, 'top_rated'); END IF;
  IF _delivered_count >= 10 THEN _badges := array_append(_badges, 'super_host'); END IF;
  IF _delivered_count >= 50 THEN _badges := array_append(_badges, 'top_100'); END IF;
  
  RETURN _badges;
END;
$$;

-- Create voyageur availability table
CREATE TABLE public.voyageur_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  available_date date NOT NULL,
  city text,
  country text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, available_date)
);

ALTER TABLE public.voyageur_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own availability" ON public.voyageur_availability
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view availability" ON public.voyageur_availability
  FOR SELECT TO authenticated
  USING (true);
