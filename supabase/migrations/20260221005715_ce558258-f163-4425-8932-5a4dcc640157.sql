
-- Create chat-photos bucket as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Users can upload to their own folder
CREATE POLICY "Users can upload chat photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view photos in their own folder (signed URLs handle cross-user sharing)
CREATE POLICY "Users can view own chat photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own chat photos
CREATE POLICY "Users can delete own chat photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
