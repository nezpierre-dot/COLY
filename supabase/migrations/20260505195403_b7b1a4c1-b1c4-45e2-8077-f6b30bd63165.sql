
CREATE OR REPLACE FUNCTION public.notify_pending_on_new_voyage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
  _title text;
  _msg text;
  _type text;
  _route text;
BEGIN
  IF NEW.status NOT IN ('active','open','published') THEN
    RETURN NEW;
  END IF;

  _route := COALESCE(NEW.departure_city,'?') || ' → ' ||
            COALESCE(NEW.arrival_city, NEW.arrival_country, '?');

  -- Pending shipments matching by departure city OR arrival country
  FOR _rec IN
    SELECT s.id, s.user_id
    FROM public.shipments s
    WHERE s.status = 'pending'
      AND s.user_id <> NEW.user_id
      AND (
        (NEW.departure_city IS NOT NULL AND lower(s.departure_city) = lower(NEW.departure_city))
        OR (NEW.arrival_country IS NOT NULL AND lower(s.arrival_country) = lower(NEW.arrival_country))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = s.user_id
          AND n.type = 'voyageur_nearby:' || NEW.id::text
          AND n.created_at > now() - interval '24 hours'
      )
  LOOP
    _title := '🧳 Un voyageur passe par chez toi';
    _msg := 'Un nouveau trajet ' || _route || ' vient d''être publié. Il pourrait correspondre à ton colis !';
    _type := 'voyageur_nearby:' || NEW.id::text;
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_rec.user_id, _title, _msg, _type);
  END LOOP;

  -- Pending NeedIt missions matching by country (or city)
  FOR _rec IN
    SELECT m.id, m.user_id
    FROM public.needit_missions m
    WHERE m.status = 'pending'
      AND m.user_id <> NEW.user_id
      AND (
        (NEW.departure_city IS NOT NULL AND m.city IS NOT NULL AND lower(m.city) = lower(NEW.departure_city))
        OR (NEW.arrival_country IS NOT NULL AND m.country IS NOT NULL AND lower(m.country) = lower(NEW.arrival_country))
        OR (NEW.departure_country IS NOT NULL AND m.country IS NOT NULL AND lower(m.country) = lower(NEW.departure_country))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = m.user_id
          AND n.type = 'voyageur_nearby_needit:' || NEW.id::text
          AND n.created_at > now() - interval '24 hours'
      )
  LOOP
    _title := '🛍️ Un voyageur peut récupérer ton produit';
    _msg := 'Nouveau trajet ' || _route || ' — il pourrait acheter et rapporter ton produit NeedIt.';
    _type := 'voyageur_nearby_needit:' || NEW.id::text;
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_rec.user_id, _title, _msg, _type);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pending_on_new_voyage ON public.voyages;
CREATE TRIGGER trg_notify_pending_on_new_voyage
AFTER INSERT ON public.voyages
FOR EACH ROW
EXECUTE FUNCTION public.notify_pending_on_new_voyage();
