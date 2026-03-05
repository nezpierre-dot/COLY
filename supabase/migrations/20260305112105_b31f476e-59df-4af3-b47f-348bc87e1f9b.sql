
CREATE OR REPLACE FUNCTION public.notify_needit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  VALUES (_owner_id, _title, _message, 'mission_status');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_needit_mission_status_change
  AFTER UPDATE ON public.needit_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_needit_status_change();
