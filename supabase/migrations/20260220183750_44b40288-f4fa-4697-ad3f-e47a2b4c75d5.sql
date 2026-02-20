
-- Conversations table (linked to a shipment)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL,
  demandeur_id UUID NOT NULL,
  voyageur_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = demandeur_id OR auth.uid() = voyageur_id);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = demandeur_id OR auth.uid() = voyageur_id);

CREATE INDEX idx_conversations_demandeur ON public.conversations(demandeur_id);
CREATE INDEX idx_conversations_voyageur ON public.conversations(voyageur_id);
CREATE UNIQUE INDEX idx_conversations_shipment ON public.conversations(shipment_id);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE demandeur_id = auth.uid() OR voyageur_id = auth.uid()
  )
);

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND conversation_id IN (
    SELECT id FROM public.conversations
    WHERE demandeur_id = auth.uid() OR voyageur_id = auth.uid()
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can update messages in own conversations"
ON public.messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE demandeur_id = auth.uid() OR voyageur_id = auth.uid()
  )
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Update last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();
