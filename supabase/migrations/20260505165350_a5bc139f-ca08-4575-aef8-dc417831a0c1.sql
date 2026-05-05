CREATE TABLE public.push_fallback_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT,
  notification_id UUID,
  related_task_id TEXT,
  push_subs_count INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  email_attempted BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_fallback_log_user ON public.push_fallback_log(user_id);
CREATE INDEX idx_push_fallback_log_created ON public.push_fallback_log(created_at DESC);
CREATE INDEX idx_push_fallback_log_event_type ON public.push_fallback_log(event_type);

ALTER TABLE public.push_fallback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push fallback logs"
ON public.push_fallback_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own push fallback logs"
ON public.push_fallback_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);