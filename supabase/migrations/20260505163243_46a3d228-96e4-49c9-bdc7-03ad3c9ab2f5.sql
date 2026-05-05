ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS critical_email_fallback BOOLEAN NOT NULL DEFAULT true;