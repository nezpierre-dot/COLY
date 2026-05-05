
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS otp_codes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmation_code_hash text;

ALTER TABLE public.needit_missions
  ADD COLUMN IF NOT EXISTS otp_codes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmation_code_hash text;

SET session_replication_role = replica;

UPDATE public.shipments SET otp_codes = confirmation_code::jsonb
WHERE confirmation_code IS NOT NULL AND left(btrim(confirmation_code), 1) = '{';

UPDATE public.shipments
  SET confirmation_code_hash = extensions.crypt(confirmation_code, extensions.gen_salt('bf'))
WHERE confirmation_code IS NOT NULL
  AND left(btrim(confirmation_code), 1) <> '{'
  AND confirmation_code_hash IS NULL;

UPDATE public.needit_missions SET otp_codes = confirmation_code::jsonb
WHERE confirmation_code IS NOT NULL AND left(btrim(confirmation_code), 1) = '{';

UPDATE public.needit_missions
  SET confirmation_code_hash = extensions.crypt(confirmation_code, extensions.gen_salt('bf'))
WHERE confirmation_code IS NOT NULL
  AND left(btrim(confirmation_code), 1) <> '{'
  AND confirmation_code_hash IS NULL;

SET session_replication_role = origin;

ALTER TABLE public.shipments DROP COLUMN IF EXISTS confirmation_code;
ALTER TABLE public.needit_missions DROP COLUMN IF EXISTS confirmation_code;

CREATE OR REPLACE FUNCTION public.generate_confirmation_code(_item_id uuid, _item_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _code text;
  _hash text;
BEGIN
  IF _item_type = 'shipment' THEN
    IF NOT EXISTS (SELECT 1 FROM public.shipments WHERE id = _item_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF _item_type = 'needit_mission' THEN
    IF NOT EXISTS (SELECT 1 FROM public.needit_missions WHERE id = _item_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid item type';
  END IF;

  _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  _hash := extensions.crypt(_code, extensions.gen_salt('bf'));

  IF _item_type = 'shipment' THEN
    UPDATE public.shipments SET confirmation_code_hash = _hash WHERE id = _item_id;
  ELSE
    UPDATE public.needit_missions SET confirmation_code_hash = _hash WHERE id = _item_id;
  END IF;

  RETURN _code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_confirmation_code(_item_id uuid, _item_type text, _code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _stored_hash text;
  _voyageur_id uuid;
BEGIN
  IF _item_type = 'shipment' THEN
    SELECT confirmation_code_hash, voyageur_id INTO _stored_hash, _voyageur_id
    FROM public.shipments WHERE id = _item_id;
  ELSIF _item_type = 'needit_mission' THEN
    SELECT confirmation_code_hash, voyageur_id INTO _stored_hash, _voyageur_id
    FROM public.needit_missions WHERE id = _item_id;
  ELSE
    RAISE EXCEPTION 'Invalid item type';
  END IF;

  IF _voyageur_id IS NULL OR _voyageur_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _stored_hash IS NULL THEN
    RETURN false;
  END IF;

  IF extensions.crypt(_code, _stored_hash) = _stored_hash THEN
    IF _item_type = 'shipment' THEN
      UPDATE public.shipments SET status = 'delivered', confirmation_code_hash = NULL WHERE id = _item_id;
    ELSE
      UPDATE public.needit_missions SET status = 'completed', confirmation_code_hash = NULL WHERE id = _item_id;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
