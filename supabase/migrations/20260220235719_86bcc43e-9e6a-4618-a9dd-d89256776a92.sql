
-- Fix 1: Tighten shipment-photos storage SELECT policy
-- Remove overly permissive policy that allows any authenticated user to read any photo
DROP POLICY IF EXISTS "Shipment photo owners can view" ON storage.objects;

-- Restrict to: photo uploader (owner folder) only. Signed URLs handle cross-user access.
CREATE POLICY "Shipment photo owner access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shipment-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 2: Add RLS policy for authenticated users to view active voyages (marketplace feature)
CREATE POLICY "Authenticated users can view active voyages"
ON public.voyages FOR SELECT
TO authenticated
USING (status = 'active');
