
ALTER TABLE public.voyages
  ADD COLUMN max_weight_kg numeric DEFAULT NULL,
  ADD COLUMN max_items integer DEFAULT NULL;

COMMENT ON COLUMN public.voyages.max_weight_kg IS 'Maximum carrying capacity in kg declared by the voyageur';
COMMENT ON COLUMN public.voyages.max_items IS 'Maximum number of items (colis/missions) the voyageur can carry';
