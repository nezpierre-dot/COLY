
-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'voyage', 'shipment', 'needit_mission'
  item_id UUID NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  delay_label TEXT NOT NULL, -- '24h', '2h', '30min'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reminders_remind_at ON public.reminders (remind_at) WHERE status = 'pending';
CREATE INDEX idx_reminders_user_item ON public.reminders (user_id, item_type, item_id);
