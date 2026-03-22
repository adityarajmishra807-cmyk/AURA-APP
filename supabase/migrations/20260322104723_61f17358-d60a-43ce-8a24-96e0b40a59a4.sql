
-- Create reports table for content flagging
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'post', 'comment', 'message', 'profile'
  content_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL, -- 'inappropriate', 'spam', 'harassment', 'hate_speech', 'violence', 'other'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Prevent duplicate reports (same user, same content)
CREATE UNIQUE INDEX reports_unique_per_user ON public.reports (reporter_id, content_type, content_id);
