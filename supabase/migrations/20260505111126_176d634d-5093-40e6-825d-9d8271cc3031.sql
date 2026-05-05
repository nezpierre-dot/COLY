
-- Public buckets allow direct URL access; remove broad SELECT policies on storage.objects
-- so the bucket cannot be listed via the API, while signed/public URLs still work.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Rating photos are publicly readable" ON storage.objects;
