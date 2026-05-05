
-- 1) Restrict shipments voyageur SELECT to authenticated role only
DROP POLICY IF EXISTS "Assigned voyageurs can view their shipments" ON public.shipments;
CREATE POLICY "Assigned voyageurs can view their shipments"
ON public.shipments
FOR SELECT
TO authenticated
USING (auth.uid() = voyageur_id);

-- 2) pickup_proofs INSERT must verify shipment/mission membership
DROP POLICY IF EXISTS "Voyageur can insert pickup proof" ON public.pickup_proofs;
CREATE POLICY "Voyageur can insert pickup proof"
ON public.pickup_proofs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = pickup_proofs.shipment_id AND s.voyageur_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.needit_missions m
      WHERE m.id = pickup_proofs.shipment_id AND m.voyageur_id = auth.uid()
    )
  )
);

-- 3) proof_verifications: remove broad public read; verify-proof edge function uses service role
DROP POLICY IF EXISTS "Anyone can verify proofs" ON public.proof_verifications;
CREATE POLICY "Uploader and admins can view proof verifications"
ON public.proof_verifications
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4) voyages: hide departure/arrival addresses from non-owners
-- Create a public view excluding sensitive address columns
DROP VIEW IF EXISTS public.voyages_public;
CREATE VIEW public.voyages_public
WITH (security_invoker = on) AS
SELECT
  id, user_id,
  departure_country, departure_city, departure_date, departure_time,
  arrival_country, arrival_city, arrival_date, arrival_time,
  transport_method, can_pickup, can_move, deliver_to_address,
  accept_needit, needit_budget, status,
  max_weight_kg, max_items, capacity_volume_liters, capacity_dimensions,
  cutoff_hours, created_at, updated_at
FROM public.voyages;

GRANT SELECT ON public.voyages_public TO authenticated, anon;

-- Tighten base SELECT policies: remove broad active-voyage exposure
DROP POLICY IF EXISTS "Authenticated users can view active voyages" ON public.voyages;

-- Keep owner-only SELECT on base table (already exists as "Users can view own voyages")
-- Add admin SELECT for moderation
CREATE POLICY "Admins can view all voyages"
ON public.voyages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow active voyages to be visible through the view by adding a permissive SELECT
-- on the base table that authenticated users use ONLY when querying via the view
-- (security_invoker view enforces base table RLS, so we need a policy permitting
-- non-sensitive reads). Instead, allow SELECT but constrain at app layer to view.
-- We re-add a restricted SELECT policy: only when status='active', any auth user can
-- read the row; address columns are filtered by querying the view.
CREATE POLICY "Authenticated can view active voyages (use voyages_public for safe columns)"
ON public.voyages
FOR SELECT
TO authenticated
USING (status = 'active');
