ALTER TABLE public.voyages ADD COLUMN IF NOT EXISTS capacity_volume_liters numeric DEFAULT NULL;
ALTER TABLE public.voyages ADD COLUMN IF NOT EXISTS capacity_dimensions text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_transports text[] DEFAULT '{}'::text[];