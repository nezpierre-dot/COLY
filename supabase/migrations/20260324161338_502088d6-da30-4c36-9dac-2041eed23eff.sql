
-- Allow voyageur to view disputes opened on their shipments or missions
CREATE POLICY "Voyageurs can view disputes on their shipments"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  shipment_id IN (SELECT id FROM public.shipments WHERE voyageur_id = auth.uid())
  OR shipment_id IN (SELECT id FROM public.needit_missions WHERE voyageur_id = auth.uid())
);

-- Allow voyageur to insert dispute messages on disputes related to their shipments/missions
CREATE POLICY "Voyageurs can insert dispute messages"
ON public.dispute_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_role = 'voyageur'
  AND (
    dispute_id IN (
      SELECT d.id FROM public.disputes d
      WHERE d.shipment_id IN (SELECT s.id FROM public.shipments s WHERE s.voyageur_id = auth.uid())
         OR d.shipment_id IN (SELECT m.id FROM public.needit_missions m WHERE m.voyageur_id = auth.uid())
    )
  )
);

-- Allow voyageur to view dispute messages on their disputes
CREATE POLICY "Voyageurs can view dispute messages"
ON public.dispute_messages
FOR SELECT
TO authenticated
USING (
  dispute_id IN (
    SELECT d.id FROM public.disputes d
    WHERE d.shipment_id IN (SELECT s.id FROM public.shipments s WHERE s.voyageur_id = auth.uid())
       OR d.shipment_id IN (SELECT m.id FROM public.needit_missions m WHERE m.voyageur_id = auth.uid())
  )
);
