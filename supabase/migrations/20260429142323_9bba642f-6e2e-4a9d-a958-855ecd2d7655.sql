
-- Add photos column to ratings
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

-- Create public bucket for rating photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('rating-photos', 'rating-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Rating photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'rating-photos');

-- Authenticated users can upload to their own folder (folder = auth.uid())
CREATE POLICY "Users can upload own rating photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rating-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can delete their own rating photos (cleanup)
CREATE POLICY "Users can delete own rating photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rating-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
