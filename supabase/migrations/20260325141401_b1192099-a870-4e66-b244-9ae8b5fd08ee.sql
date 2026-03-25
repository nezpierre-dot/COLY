
ALTER TABLE public.conversations ADD COLUMN is_archived_by uuid[] NOT NULL DEFAULT '{}';

-- Allow conversation participants to update (for archiving)
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
TO public
USING (auth.uid() = demandeur_id OR auth.uid() = voyageur_id)
WITH CHECK (auth.uid() = demandeur_id OR auth.uid() = voyageur_id);
