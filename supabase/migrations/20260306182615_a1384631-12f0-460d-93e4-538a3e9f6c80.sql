CREATE OR REPLACE FUNCTION public.generate_confirmation_code(_item_id uuid, _item_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
BEGIN
  -- Verify caller is the owner of this item
  IF _item_type = 'shipment' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.shipments
      WHERE id = _item_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF _item_type = 'needit_mission' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.needit_missions
      WHERE id = _item_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid item type';
  END IF;

  -- Generate random 6-char alphanumeric code
  _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  
  IF _item_type = 'shipment' THEN
    UPDATE public.shipments SET confirmation_code = _code WHERE id = _item_id;
  ELSIF _item_type = 'needit_mission' THEN
    UPDATE public.needit_missions SET confirmation_code = _code WHERE id = _item_id;
  END IF;
  
  RETURN _code;
END;
$function$