
-- Create shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Step 1: Trajet
  departure_date DATE NOT NULL,
  departure_method TEXT NOT NULL,
  departure_city TEXT,
  relay_point TEXT,
  arrival_city TEXT NOT NULL,
  arrival_country TEXT NOT NULL,
  contact_nom TEXT NOT NULL,
  contact_prenom TEXT NOT NULL,
  contact_tel TEXT NOT NULL,
  contact_email TEXT,
  
  -- Step 2: Colis
  photo_url TEXT,
  size TEXT NOT NULL DEFAULT 'S',
  
  -- Step 3: Tarif
  tarif TEXT NOT NULL,
  insured BOOLEAN NOT NULL DEFAULT false,
  is_international BOOLEAN NOT NULL DEFAULT false,
  
  -- Voyageur matching
  voyageur_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Users can view their own shipments
CREATE POLICY "Users can view their own shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own shipments
CREATE POLICY "Users can create their own shipments"
ON public.shipments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shipments
CREATE POLICY "Users can update their own shipments"
ON public.shipments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Voyageurs can view pending shipments (to accept them)
CREATE POLICY "Voyageurs can view pending shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for shipment photos
INSERT INTO storage.buckets (id, name, public) VALUES ('shipment-photos', 'shipment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shipment photos
CREATE POLICY "Users can upload shipment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shipment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Shipment photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-photos');

-- Also create kyc-documents bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
