
-- Set replica identity to FULL on calls table for reliable Realtime filters
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- Also ensure messages table has full replica identity for chat realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
