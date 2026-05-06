-- 1. Add attempts/lock tracking columns
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS confirmation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_locked_until timestamptz;

ALTER TABLE public.needit_missions
  ADD COLUMN IF NOT EXISTS confirmation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_locked_until timestamptz;

-- 2. Hide confirmation_code_hash from clients (column-level privilege)
REVOKE SELECT (confirmation_code_hash) ON public.shipments FROM anon, authenticated;
REVOKE SELECT (confirmation_code_hash) ON public.needit_missions FROM anon, authenticated;

-- 3. Replace generate_confirmation_code: also resets attempts/lock
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
    UPDATE public.shipments
       SET confirmation_code_hash = _hash,
           confirmation_attempts = 0,
           confirmation_locked_until = NULL
     WHERE id = _item_id;
  ELSE
    UPDATE public.needit_missions
       SET confirmation_code_hash = _hash,
           confirmation_attempts = 0,
           confirmation_locked_until = NULL
     WHERE id = _item_id;
  END IF;

  RETURN _code;
END;
$function$;

-- 4. Replace validate_confirmation_code with jsonb result + rate limiting
DROP FUNCTION IF EXISTS public.validate_confirmation_code(uuid, text, text);

CREATE OR REPLACE FUNCTION public.validate_confirmation_code(_item_id uuid, _item_type text, _code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _stored_hash text;
  _voyageur_id uuid;
  _attempts int;
  _locked_until timestamptz;
  _max_attempts constant int := 5;
  _lock_minutes constant int := 15;
BEGIN
  IF _item_type = 'shipment' THEN
    SELECT confirmation_code_hash, voyageur_id, confirmation_attempts, confirmation_locked_until
      INTO _stored_hash, _voyageur_id, _attempts, _locked_until
      FROM public.shipments WHERE id = _item_id FOR UPDATE;
  ELSIF _item_type = 'needit_mission' THEN
    SELECT confirmation_code_hash, voyageur_id, confirmation_attempts, confirmation_locked_until
      INTO _stored_hash, _voyageur_id, _attempts, _locked_until
      FROM public.needit_missions WHERE id = _item_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Invalid item type';
  END IF;

  IF _voyageur_id IS NULL OR _voyageur_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check lock
  IF _locked_until IS NOT NULL AND _locked_until > now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'locked',
      'locked_until', _locked_until,
      'attempts_left', 0
    );
  END IF;

  -- If lock expired, reset attempts
  IF _locked_until IS NOT NULL AND _locked_until <= now() THEN
    _attempts := 0;
    _locked_until := NULL;
  END IF;

  IF _stored_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_code', 'attempts_left', _max_attempts - _attempts);
  END IF;

  IF extensions.crypt(_code, _stored_hash) = _stored_hash THEN
    IF _item_type = 'shipment' THEN
      UPDATE public.shipments
         SET status = 'delivered',
             confirmation_code_hash = NULL,
             confirmation_attempts = 0,
             confirmation_locked_until = NULL
       WHERE id = _item_id;
    ELSE
      UPDATE public.needit_missions
         SET status = 'completed',
             confirmation_code_hash = NULL,
             confirmation_attempts = 0,
             confirmation_locked_until = NULL
       WHERE id = _item_id;
    END IF;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Wrong code → increment
  _attempts := _attempts + 1;
  IF _attempts >= _max_attempts THEN
    _locked_until := now() + make_interval(mins => _lock_minutes);
  END IF;

  IF _item_type = 'shipment' THEN
    UPDATE public.shipments
       SET confirmation_attempts = _attempts,
           confirmation_locked_until = _locked_until
     WHERE id = _item_id;
  ELSE
    UPDATE public.needit_missions
       SET confirmation_attempts = _attempts,
           confirmation_locked_until = _locked_until
     WHERE id = _item_id;
  END IF;

  IF _locked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'locked',
      'locked_until', _locked_until,
      'attempts_left', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', false,
    'error', 'invalid_code',
    'attempts_left', _max_attempts - _attempts
  );
END;
$function$;