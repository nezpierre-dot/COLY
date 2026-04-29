
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'fr';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS i18n_key text,
  ADD COLUMN IF NOT EXISTS i18n_params jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_i18n_key ON public.notifications(i18n_key) WHERE i18n_key IS NOT NULL;
