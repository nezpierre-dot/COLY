
-- Lock down wallets: only service-role can modify balance
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;

-- Allow users to create their wallet only with default zero balance
CREATE POLICY "Users can create own empty wallet"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(balance, 0) = 0);

-- Defensive: prevent any client-side INSERT into wallet_transactions
-- (no INSERT/UPDATE/DELETE policies exist; service role bypasses RLS)
-- Add an explicit deny-all by not creating any policy. Already the case.

-- Enable leaked password protection requires auth config (handled separately).
