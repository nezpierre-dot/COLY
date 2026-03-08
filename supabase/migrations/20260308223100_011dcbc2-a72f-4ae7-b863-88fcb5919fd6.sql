
-- Wallet table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'credit',
  description text,
  reference_id uuid,
  reference_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fraud checks table
CREATE TABLE public.fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  photo_url text NOT NULL,
  result text NOT NULL DEFAULT 'pending',
  confidence numeric,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fraud checks" ON public.fraud_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fraud checks" ON public.fraud_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all fraud checks" ON public.fraud_checks FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.auto_create_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_wallet();

-- Update updated_at on wallets
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
