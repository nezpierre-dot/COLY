
-- Add escrow columns to shipments
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_expires_at timestamp with time zone;

-- Create disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  photo_url text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS: users can create disputes for their own shipments
CREATE POLICY "Users can create own disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      shipment_id IN (SELECT id FROM public.shipments WHERE user_id = auth.uid())
      OR shipment_id IN (SELECT id FROM public.shipments WHERE voyageur_id = auth.uid())
      OR shipment_id IN (SELECT id FROM public.needit_missions WHERE user_id = auth.uid())
      OR shipment_id IN (SELECT id FROM public.needit_missions WHERE voyageur_id = auth.uid())
    )
  );

-- RLS: users can view own disputes
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RLS: admins can view all disputes
CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can update disputes (resolve/refund)
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger for updated_at
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin function to list disputes
CREATE OR REPLACE FUNCTION public.admin_get_disputes(_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid, shipment_id uuid, user_id uuid, reason text, description text, 
  photo_url text, status text, resolution text, created_at timestamptz,
  reporter_name text, shipment_ref text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT d.id, d.shipment_id, d.user_id, d.reason, d.description,
         d.photo_url, d.status, d.resolution, d.created_at,
         COALESCE(p.full_name, 'Anonyme') AS reporter_name,
         'COLY-' || upper(left(d.shipment_id::text, 8)) AS shipment_ref
  FROM public.disputes d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  ORDER BY 
    CASE d.status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 ELSE 2 END,
    d.created_at DESC
  LIMIT _limit;
END;
$$;

-- Function to start escrow after delivery confirmation
CREATE OR REPLACE FUNCTION public.start_escrow_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    NEW.escrow_status := 'held';
    NEW.escrow_expires_at := now() + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_start_escrow_on_delivery
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.start_escrow_on_delivery();
