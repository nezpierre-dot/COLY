-- Allow voyageurs to update disputes on their shipments/missions (for amicable closure)
CREATE POLICY "Voyageurs can update disputes on their items"
ON public.disputes
FOR UPDATE
TO authenticated
USING (
  (shipment_id IN (SELECT id FROM shipments WHERE voyageur_id = auth.uid()))
  OR
  (shipment_id IN (SELECT id FROM needit_missions WHERE voyageur_id = auth.uid()))
);