-- Lock confirmation_code_hash truly: revoke table SELECT/UPDATE/INSERT then regrant explicit columns excluding the hash.
-- shipments
REVOKE SELECT, INSERT, UPDATE ON public.shipments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (
  id, user_id, status, departure_date, departure_method, departure_city, relay_point,
  arrival_city, arrival_country, contact_nom, contact_prenom, contact_tel, contact_email,
  photo_url, size, tarif, insured, is_international, voyageur_id, created_at, updated_at,
  pickup_address, pickup_access_code, escrow_status, escrow_expires_at,
  departure_address, departure_access_code, otp_codes,
  confirmation_attempts, confirmation_locked_until
) ON public.shipments TO authenticated;
GRANT SELECT (
  id, user_id, status, departure_date, departure_method, departure_city, relay_point,
  arrival_city, arrival_country, contact_nom, contact_prenom, contact_tel, contact_email,
  photo_url, size, tarif, insured, is_international, voyageur_id, created_at, updated_at,
  pickup_address, pickup_access_code, escrow_status, escrow_expires_at,
  departure_address, departure_access_code, otp_codes,
  confirmation_attempts, confirmation_locked_until
) ON public.shipments TO anon;
GRANT DELETE ON public.shipments TO authenticated;

-- needit_missions
REVOKE SELECT, INSERT, UPDATE ON public.needit_missions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (
  id, user_id, country, city, timing, category_path, product_name, is_unlisted,
  unlisted_description, photo_url, dimension, poids, prix_max, status,
  created_at, updated_at, voyageur_id, ean_code, ean_verified, auto_accept,
  pickup_address, pickup_access_code, otp_codes,
  confirmation_attempts, confirmation_locked_until
) ON public.needit_missions TO authenticated;
GRANT SELECT (
  id, user_id, country, city, timing, category_path, product_name, is_unlisted,
  unlisted_description, photo_url, dimension, poids, prix_max, status,
  created_at, updated_at, voyageur_id, ean_code, ean_verified, auto_accept,
  pickup_address, pickup_access_code, otp_codes,
  confirmation_attempts, confirmation_locked_until
) ON public.needit_missions TO anon;
GRANT DELETE ON public.needit_missions TO authenticated;

-- Storage: allow uploaders to delete their own shipment photos
CREATE POLICY "Users can delete their own shipment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shipment-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);