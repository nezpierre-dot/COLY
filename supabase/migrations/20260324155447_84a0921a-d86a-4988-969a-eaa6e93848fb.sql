
-- Add photo_url column to dispute_messages
ALTER TABLE public.dispute_messages ADD COLUMN photo_url text;

-- Enable realtime for dispute_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;
