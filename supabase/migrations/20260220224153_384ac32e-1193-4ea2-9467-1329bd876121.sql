-- ============================================================
-- Session 1: Notation + Preuve de livraison
-- ============================================================

-- 1. Table des évaluations mutuelles
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  rater_role text NOT NULL CHECK (rater_role IN ('demandeur', 'voyageur')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut créer une note s'il est rater
CREATE POLICY "Users can insert own ratings"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rater_id);

-- Les deux parties impliquées peuvent voir la note
CREATE POLICY "Involved parties can view ratings"
ON public.ratings FOR SELECT
TO authenticated
USING (auth.uid() = rater_id OR auth.uid() = rated_id);

-- Index pour récupérer rapidement les notes d'un utilisateur
CREATE INDEX idx_ratings_rated_id ON public.ratings (rated_id);
CREATE INDEX idx_ratings_shipment_id ON public.ratings (shipment_id);

-- 2. Table des preuves de livraison
CREATE TABLE public.delivery_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  photo_url text NOT NULL,
  latitude double precision,
  longitude double precision,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Seul le voyageur assigné peut uploader la preuve
CREATE POLICY "Voyageur can insert delivery proof"
ON public.delivery_proofs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.shipments
    WHERE id = shipment_id AND voyageur_id = auth.uid()
  )
);

-- Les deux parties peuvent voir la preuve
CREATE POLICY "Involved parties can view delivery proof"
ON public.delivery_proofs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shipments
    WHERE id = shipment_id AND (user_id = auth.uid() OR voyageur_id = auth.uid())
  )
);

CREATE INDEX idx_delivery_proofs_shipment_id ON public.delivery_proofs (shipment_id);

-- 3. Fonction pour récupérer la note moyenne d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_rating(_user_id uuid)
RETURNS TABLE(average_score numeric, total_ratings bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ROUND(AVG(score)::numeric, 1) AS average_score,
    COUNT(*) AS total_ratings
  FROM public.ratings
  WHERE rated_id = _user_id;
$$;