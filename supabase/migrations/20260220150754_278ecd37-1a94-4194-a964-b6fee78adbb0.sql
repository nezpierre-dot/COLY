
-- Add KYC status to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending';

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can view their own KYC documents
CREATE POLICY "Users can view own KYC docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can update their own KYC documents
CREATE POLICY "Users can update own KYC docs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
