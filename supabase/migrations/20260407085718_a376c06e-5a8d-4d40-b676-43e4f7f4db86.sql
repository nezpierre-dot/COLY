
CREATE POLICY "Users can update own favorite addresses" ON public.favorite_addresses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
