
-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create story_views table
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create story_reactions table
CREATE TABLE public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- Story views policies
CREATE POLICY "Story owners and viewers can see views"
  ON public.story_views FOR SELECT
  USING (
    viewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can mark stories as viewed"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Story reactions policies
CREATE POLICY "Anyone can view reactions on active stories"
  ON public.story_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND expires_at > now()));

CREATE POLICY "Users can react to stories"
  ON public.story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON public.story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);

-- Enable realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

-- Create storage bucket for story media
INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true);

-- Storage policies for story media
CREATE POLICY "Anyone can view story media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-media');

CREATE POLICY "Users can upload story media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their story media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);
