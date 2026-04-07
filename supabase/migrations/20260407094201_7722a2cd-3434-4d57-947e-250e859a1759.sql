
CREATE POLICY "Service role can update verification" ON public.proof_verifications
  FOR UPDATE USING (true) WITH CHECK (true);
