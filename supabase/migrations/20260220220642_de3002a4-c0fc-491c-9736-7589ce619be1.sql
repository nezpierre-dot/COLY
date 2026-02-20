-- Fix: Allow assigned voyageurs to update shipments they've been assigned to
DROP POLICY IF EXISTS "Users can update their own shipments" ON public.shipments;

CREATE POLICY "Owners and assigned voyageurs can update shipments"
ON public.shipments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = voyageur_id);