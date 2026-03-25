
-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
TO public
USING (auth.uid() = demandeur_id OR auth.uid() = voyageur_id);

-- Allow users to delete messages in conversations they belong to
CREATE POLICY "Users can delete messages in own conversations"
ON public.messages
FOR DELETE
TO public
USING (conversation_id IN (
  SELECT id FROM conversations
  WHERE demandeur_id = auth.uid() OR voyageur_id = auth.uid()
));
