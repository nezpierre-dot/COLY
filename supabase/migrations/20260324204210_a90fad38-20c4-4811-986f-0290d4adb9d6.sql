-- Allow authenticated users to read any profile (for public profile pages)
CREATE POLICY "Authenticated users can read any profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);