
DROP POLICY "Service role can insert archive" ON public.cancelled_matches_archive;

CREATE POLICY "Users can archive own cancellations"
  ON public.cancelled_matches_archive
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
