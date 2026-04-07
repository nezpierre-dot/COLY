
-- Admin alerts table
CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts" ON public.admin_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts" ON public.admin_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts" ON public.admin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_admin_alerts_unread ON public.admin_alerts (is_read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;

-- Seed alert thresholds config
INSERT INTO public.platform_config (config_key, config_value, description)
VALUES ('alert_thresholds', '{
  "cancellation_rate_pct": 30,
  "fraud_confidence_min": 0.7,
  "dispute_escalation_hours": 72,
  "low_rating_threshold": 2.5,
  "unresolved_disputes_max": 10,
  "pending_shipments_stale_days": 7
}'::jsonb, 'Seuils déclenchant des alertes admin automatiques')
ON CONFLICT (config_key) DO NOTHING;

-- RPC to get alert thresholds and check them
CREATE OR REPLACE FUNCTION public.admin_check_thresholds()
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _thresholds jsonb;
  _cancel_rate numeric;
  _total_recent int;
  _cancelled_recent int;
  _open_disputes int;
  _fraud_pending int;
  _stale_pending int;
  _alerts json[] := '{}';
BEGIN
  SELECT config_value INTO _thresholds
  FROM public.platform_config WHERE config_key = 'alert_thresholds';

  IF _thresholds IS NULL THEN
    RETURN '[]'::json;
  END IF;

  -- 1. Cancellation rate (last 30 days)
  SELECT count(*) INTO _total_recent FROM public.shipments WHERE created_at >= now() - interval '30 days';
  SELECT count(*) INTO _cancelled_recent FROM public.shipments WHERE status = 'cancelled' AND created_at >= now() - interval '30 days';
  
  IF _total_recent > 5 THEN
    _cancel_rate := round((_cancelled_recent::numeric / _total_recent) * 100, 1);
    IF _cancel_rate >= COALESCE((_thresholds->>'cancellation_rate_pct')::numeric, 30) THEN
      _alerts := array_append(_alerts, json_build_object(
        'type', 'high_cancellation',
        'severity', 'critical',
        'title', 'Taux d''annulation critique',
        'message', 'Le taux d''annulation est de ' || _cancel_rate || '% sur les 30 derniers jours (' || _cancelled_recent || '/' || _total_recent || ')',
        'metadata', json_build_object('rate', _cancel_rate, 'cancelled', _cancelled_recent, 'total', _total_recent)
      ));
    END IF;
  END IF;

  -- 2. Unresolved disputes
  SELECT count(*) INTO _open_disputes FROM public.disputes WHERE status IN ('open', 'investigating');
  IF _open_disputes >= COALESCE((_thresholds->>'unresolved_disputes_max')::int, 10) THEN
    _alerts := array_append(_alerts, json_build_object(
      'type', 'too_many_disputes',
      'severity', 'critical',
      'title', 'Litiges non résolus en excès',
      'message', _open_disputes || ' litiges sont en attente de résolution',
      'metadata', json_build_object('count', _open_disputes)
    ));
  END IF;

  -- 3. Pending fraud checks
  SELECT count(*) INTO _fraud_pending FROM public.fraud_checks WHERE result IN ('fraudulent', 'suspicious') AND created_at >= now() - interval '7 days';
  IF _fraud_pending > 0 THEN
    _alerts := array_append(_alerts, json_build_object(
      'type', 'fraud_detected',
      'severity', CASE WHEN _fraud_pending >= 5 THEN 'critical' ELSE 'warning' END,
      'title', 'Fraudes détectées',
      'message', _fraud_pending || ' vérification(s) suspecte(s) ou frauduleuse(s) cette semaine',
      'metadata', json_build_object('count', _fraud_pending)
    ));
  END IF;

  -- 4. Stale pending shipments
  SELECT count(*) INTO _stale_pending FROM public.shipments 
  WHERE status = 'pending' AND created_at < now() - (COALESCE((_thresholds->>'pending_shipments_stale_days')::int, 7) || ' days')::interval;
  IF _stale_pending > 0 THEN
    _alerts := array_append(_alerts, json_build_object(
      'type', 'stale_shipments',
      'severity', 'warning',
      'title', 'Colis en attente prolongée',
      'message', _stale_pending || ' colis sans voyageur depuis plus de ' || COALESCE((_thresholds->>'pending_shipments_stale_days')::int, 7) || ' jours',
      'metadata', json_build_object('count', _stale_pending)
    ));
  END IF;

  RETURN array_to_json(_alerts);
END;
$function$;

-- Trigger to auto-create alert on new fraud detection
CREATE OR REPLACE FUNCTION public.alert_on_fraud_detection()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.result IN ('fraudulent', 'suspicious') THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, message, metadata)
    VALUES (
      'fraud_detected',
      CASE WHEN NEW.result = 'fraudulent' THEN 'critical' ELSE 'warning' END,
      CASE WHEN NEW.result = 'fraudulent' THEN '🚨 Fraude détectée' ELSE '⚠️ Photo suspecte' END,
      'Vérification ' || NEW.result || ' (confiance: ' || COALESCE(round(NEW.confidence::numeric * 100), 0) || '%) sur COLY-' || upper(left(NEW.shipment_id::text, 8)),
      jsonb_build_object('shipment_id', NEW.shipment_id, 'user_id', NEW.user_id, 'confidence', NEW.confidence, 'result', NEW.result)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_alert_on_fraud
  AFTER INSERT ON public.fraud_checks
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_fraud_detection();

-- Trigger to auto-create alert on new dispute
CREATE OR REPLACE FUNCTION public.alert_on_new_dispute()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, severity, title, message, metadata)
  VALUES (
    'new_dispute',
    'warning',
    '⚖️ Nouveau litige ouvert',
    'Raison: ' || NEW.reason || ' — Réf: COLY-' || upper(left(NEW.shipment_id::text, 8)),
    jsonb_build_object('dispute_id', NEW.id, 'shipment_id', NEW.shipment_id, 'user_id', NEW.user_id, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_alert_on_dispute
  AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_new_dispute();

-- Trigger to auto-create alert on user suspension
CREATE OR REPLACE FUNCTION public.alert_on_suspension()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.suspended_at IS NULL AND NEW.suspended_at IS NOT NULL THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, message, metadata)
    VALUES (
      'user_suspended',
      'info',
      '⛔ Utilisateur suspendu',
      COALESCE(NEW.full_name, 'Utilisateur') || ' a été suspendu. Raison: ' || COALESCE(NEW.suspension_reason, 'Non spécifiée'),
      jsonb_build_object('user_id', NEW.user_id, 'reason', NEW.suspension_reason)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_alert_on_suspension
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_suspension();
