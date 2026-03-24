
CREATE POLICY "Voyageurs can update accepted missions"
ON public.needit_missions
FOR UPDATE
TO authenticated
USING (auth.uid() = voyageur_id)
WITH CHECK (auth.uid() = voyageur_id);
