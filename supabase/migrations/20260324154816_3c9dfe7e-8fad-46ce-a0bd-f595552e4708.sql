
-- Table for dispute message history (admin <-> demandeur exchanges)
CREATE TABLE public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their own disputes
CREATE POLICY "Users can view own dispute messages"
ON public.dispute_messages FOR SELECT
TO authenticated
USING (
  dispute_id IN (SELECT id FROM public.disputes WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- Users can insert messages on their own disputes
CREATE POLICY "Users can insert own dispute messages"
ON public.dispute_messages FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = sender_id AND sender_role = 'user' AND dispute_id IN (SELECT id FROM public.disputes WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin')
);
