-- 1) Table d'événements analytics produit
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  category TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  platform TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON public.analytics_events(category);

-- 2) RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Insertion : un user authentifié peut insérer ses propres events
CREATE POLICY "Users can insert their own analytics events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Lecture : seul un admin peut lire (via fonction sécurisée)
CREATE POLICY "Admins can read analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) RPC admin : aperçu agrégé des 30 derniers jours
CREATE OR REPLACE FUNCTION public.admin_get_analytics_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'top_events', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT event_name, count(*) AS count
        FROM public.analytics_events
        WHERE created_at >= now() - interval '30 days'
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 20
      ) t
    ),
    'hub_clicks', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          COALESCE(properties->>'hub', 'unknown') AS hub,
          count(*) AS count,
          count(DISTINCT user_id) AS unique_users
        FROM public.analytics_events
        WHERE event_name = 'hub_click'
          AND created_at >= now() - interval '30 days'
        GROUP BY properties->>'hub'
        ORDER BY count DESC
      ) t
    ),
    'checklist_steps', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          COALESCE(properties->>'step', 'unknown') AS step,
          count(*) AS clicks,
          count(DISTINCT user_id) AS unique_users
        FROM public.analytics_events
        WHERE event_name = 'checklist_step_click'
          AND created_at >= now() - interval '30 days'
        GROUP BY properties->>'step'
        ORDER BY clicks DESC
      ) t
    ),
    'checklist_funnel', (
      SELECT json_build_object(
        'shown', (SELECT count(DISTINCT user_id) FROM public.analytics_events
                  WHERE event_name = 'checklist_shown' AND created_at >= now() - interval '30 days'),
        'engaged', (SELECT count(DISTINCT user_id) FROM public.analytics_events
                    WHERE event_name = 'checklist_step_click' AND created_at >= now() - interval '30 days'),
        'completed', (SELECT count(DISTINCT user_id) FROM public.analytics_events
                      WHERE event_name = 'checklist_completed' AND created_at >= now() - interval '30 days'),
        'dismissed', (SELECT count(DISTINCT user_id) FROM public.analytics_events
                      WHERE event_name = 'checklist_dismissed' AND created_at >= now() - interval '30 days')
      )
    ),
    'hub_tabs', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          COALESCE(properties->>'hub', 'unknown') AS hub,
          COALESCE(properties->>'tab', 'unknown') AS tab,
          count(*) AS count
        FROM public.analytics_events
        WHERE event_name = 'hub_tab_change'
          AND created_at >= now() - interval '30 days'
        GROUP BY properties->>'hub', properties->>'tab'
        ORDER BY count DESC
        LIMIT 30
      ) t
    ),
    'daily_volume', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT created_at::date AS day, count(*) AS events
        FROM public.analytics_events
        WHERE created_at >= now() - interval '30 days'
        GROUP BY created_at::date
        ORDER BY day
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;