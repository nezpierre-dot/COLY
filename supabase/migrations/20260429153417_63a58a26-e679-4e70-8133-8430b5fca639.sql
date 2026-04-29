-- ============ PUSH SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users insert own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users delete own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ============ TRIGGER: invoke send-push on new notification ============
CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://hyvqqfmlhcjbwrbpmdwr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type,
        'notification_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_send_push ON public.notifications;
CREATE TRIGGER notifications_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_push();

-- ============ PUBLIC RPCs (guest mode) ============
CREATE OR REPLACE FUNCTION public.get_public_voyages(_limit int DEFAULT 50, _country text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  ref_number text,
  departure_city text,
  departure_country text,
  arrival_city text,
  arrival_country text,
  departure_date date,
  transport_method text,
  max_weight_kg numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    'VOY-' || upper(left(v.id::text, 8)) AS ref_number,
    v.departure_city,
    v.departure_country,
    v.arrival_city,
    v.arrival_country,
    v.departure_date,
    v.transport_method,
    v.max_weight_kg
  FROM public.voyages v
  WHERE v.status = 'active'
    AND v.departure_date >= current_date
    AND (_country IS NULL OR lower(v.arrival_country) = lower(_country))
  ORDER BY v.departure_date ASC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_public_voyage(_id uuid)
RETURNS TABLE(
  id uuid,
  ref_number text,
  departure_city text,
  departure_country text,
  arrival_city text,
  arrival_country text,
  departure_date date,
  arrival_date date,
  transport_method text,
  max_weight_kg numeric,
  capacity_dimensions text,
  accept_needit boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    'VOY-' || upper(left(v.id::text, 8)),
    v.departure_city, v.departure_country,
    v.arrival_city, v.arrival_country,
    v.departure_date, v.arrival_date,
    v.transport_method, v.max_weight_kg, v.capacity_dimensions, v.accept_needit
  FROM public.voyages v
  WHERE v.id = _id AND v.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_public_mission(_id uuid)
RETURNS TABLE(
  id uuid,
  ref_number text,
  product_name text,
  country text,
  city text,
  prix_max text,
  photo_url text,
  category_path text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    'NEED-' || upper(left(m.id::text, 8)),
    m.product_name, m.country, m.city, m.prix_max, m.photo_url, m.category_path
  FROM public.needit_missions m
  WHERE m.id = _id AND m.status = 'pending';
$$;

CREATE OR REPLACE FUNCTION public.get_public_shipment(_id uuid)
RETURNS TABLE(
  id uuid,
  ref_number text,
  departure_city text,
  arrival_city text,
  arrival_country text,
  size text,
  tarif text,
  departure_date date,
  photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    'COLY-' || upper(left(s.id::text, 8)),
    s.departure_city, s.arrival_city, s.arrival_country,
    s.size, s.tarif, s.departure_date, s.photo_url
  FROM public.shipments s
  WHERE s.id = _id AND s.status = 'pending';
$$;

CREATE OR REPLACE FUNCTION public.get_popular_routes(_limit int DEFAULT 12)
RETURNS TABLE(
  departure_city text,
  arrival_city text,
  arrival_country text,
  voyage_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.departure_city,
    v.arrival_city,
    v.arrival_country,
    count(*) AS voyage_count
  FROM public.voyages v
  WHERE v.status = 'active' AND v.departure_date >= current_date
  GROUP BY v.departure_city, v.arrival_city, v.arrival_country
  ORDER BY voyage_count DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_voyages(int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_voyage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_mission(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_shipment(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_routes(int) TO anon, authenticated;