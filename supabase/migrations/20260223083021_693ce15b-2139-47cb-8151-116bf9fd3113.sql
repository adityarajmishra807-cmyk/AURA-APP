
-- Create calls table for WebRTC signaling
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing',
  type TEXT NOT NULL DEFAULT 'audio',
  offer JSONB,
  answer JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Only participants can view their calls
CREATE POLICY "Participants can view their calls"
ON public.calls FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Only caller can create calls
CREATE POLICY "Users can create calls"
ON public.calls FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Participants can update their calls
CREATE POLICY "Participants can update their calls"
ON public.calls FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for calls table
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
