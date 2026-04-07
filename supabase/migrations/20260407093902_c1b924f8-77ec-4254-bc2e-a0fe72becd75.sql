
CREATE TABLE public.proof_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proof_id TEXT NOT NULL UNIQUE,
  shipment_id TEXT NOT NULL,
  proof_type TEXT NOT NULL DEFAULT 'delivery',
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proof_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for public QR verification)
CREATE POLICY "Anyone can verify proofs" ON public.proof_verifications
  FOR SELECT USING (true);

-- Authenticated users can insert their own proofs
CREATE POLICY "Users can insert own proofs" ON public.proof_verifications
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
