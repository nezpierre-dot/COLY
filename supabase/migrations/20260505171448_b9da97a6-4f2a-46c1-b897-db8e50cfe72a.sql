-- Allow demandeur and voyageur of a NeedIt mission to view delivery proofs
DROP POLICY IF EXISTS "Involved parties can view delivery proof" ON public.delivery_proofs;

CREATE POLICY "Involved parties can view delivery proof"
ON public.delivery_proofs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = delivery_proofs.shipment_id
      AND (s.user_id = auth.uid() OR s.voyageur_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.needit_missions m
    WHERE m.id = delivery_proofs.shipment_id
      AND (m.user_id = auth.uid() OR m.voyageur_id = auth.uid())
  )
);

-- Allow voyageur to upload delivery proof for NeedIt missions too
DROP POLICY IF EXISTS "Voyageur can insert delivery proof" ON public.delivery_proofs;

CREATE POLICY "Voyageur can insert delivery proof"
ON public.delivery_proofs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = delivery_proofs.shipment_id AND s.voyageur_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.needit_missions m
      WHERE m.id = delivery_proofs.shipment_id AND m.voyageur_id = auth.uid()
    )
  )
);

-- Ensure realtime broadcasts changes for the proofs and mission rows
ALTER TABLE public.delivery_proofs REPLICA IDENTITY FULL;
ALTER TABLE public.pickup_proofs REPLICA IDENTITY FULL;
ALTER TABLE public.needit_missions REPLICA IDENTITY FULL;

-- Add to realtime publication if not already
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_proofs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_proofs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.needit_missions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;