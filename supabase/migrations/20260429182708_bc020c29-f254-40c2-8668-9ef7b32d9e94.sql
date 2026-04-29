
-- 1) Restrict profile reads: remove broad "any authenticated user can read any profile"
DROP POLICY IF EXISTS "Authenticated users can read any profile" ON public.profiles;

-- Create a public-safe view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  full_name,
  avatar_url,
  bio,
  trust_badges,
  kyc_status,
  preferred_transports,
  created_at,
  last_seen_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Allow authenticated users to read non-sensitive columns of any profile through the view.
-- The base table still has its "Users can read own profile" policy (auth.uid() = user_id),
-- so phone/address/stripe_customer_id/referred_by/suspension fields stay private to the owner.
CREATE POLICY "Authenticated can read public profile fields"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- The above is permissive too; we instead want to keep base table strict.
DROP POLICY IF EXISTS "Authenticated can read public profile fields" ON public.profiles;

-- Admin can read any profile (full data) for moderation
CREATE POLICY "Admins can read any profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Wallet transactions: prevent users from inserting their own transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
-- Only service_role (edge functions) can insert/update wallet transactions now.
