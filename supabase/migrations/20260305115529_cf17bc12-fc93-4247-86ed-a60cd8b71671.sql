
-- Update notify_pickup to embed shipment_id in type
CREATE OR REPLACE FUNCTION public.notify_pickup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _owner_id uuid;
  _product_name text;
BEGIN
  -- Try shipment first
  SELECT user_id INTO _owner_id FROM public.shipments WHERE id = NEW.shipment_id;
  
  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_owner_id, 'Colis récupéré ✅', 'Le voyageur a récupéré votre colis et a fourni une preuve photo.', 'pickup:' || NEW.shipment_id::text);
  ELSE
    -- Try needit mission
    SELECT user_id, product_name INTO _owner_id, _product_name FROM public.needit_missions WHERE id = NEW.shipment_id;
    IF _owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_owner_id, 'Produit récupéré ✅', 'Le voyageur a récupéré votre produit ' || COALESCE(_product_name, '') || ' et a fourni une preuve photo.', 'pickup:needit:' || NEW.shipment_id::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update notify_needit_status_change to embed mission id in type
CREATE OR REPLACE FUNCTION public.notify_needit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _owner_id uuid;
  _product text;
  _title text;
  _message text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  _owner_id := NEW.user_id;
  _product := COALESCE(NEW.product_name, 'votre produit');

  CASE NEW.status
    WHEN 'picked_up' THEN
      _title := 'Colis récupéré 📦';
      _message := 'Le voyageur a récupéré ' || _product || '. Il est maintenant en sa possession.';
    WHEN 'in_transit' THEN
      _title := 'En transit 🚀';
      _message := _product || ' est en route vers vous !';
    WHEN 'completed' THEN
      _title := 'Livré ✅';
      _message := _product || ' a été livré avec succès. N''oubliez pas de noter le voyageur !';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_owner_id, _title, _message, 'mission_status:' || NEW.id::text);

  RETURN NEW;
END;
$function$;
