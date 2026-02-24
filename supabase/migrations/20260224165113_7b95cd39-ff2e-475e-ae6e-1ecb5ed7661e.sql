
-- Fix 1: Restrict posts SELECT to authenticated users only
DROP POLICY "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable by authenticated users"
ON public.posts FOR SELECT TO authenticated
USING (true);

-- Fix 2: Restrict stories SELECT to authenticated users only
DROP POLICY "Anyone can view active stories" ON public.stories;
CREATE POLICY "Active stories viewable by authenticated users"
ON public.stories FOR SELECT TO authenticated
USING (expires_at > now());

-- Fix 3: Restrict story_ratings SELECT to authenticated users only
DROP POLICY "Anyone can view story ratings" ON public.story_ratings;
CREATE POLICY "Story ratings viewable by authenticated users"
ON public.story_ratings FOR SELECT TO authenticated
USING (true);

-- Fix 4: Restrict story_reactions SELECT to authenticated users only
DROP POLICY "Anyone can view reactions on active stories" ON public.story_reactions;
CREATE POLICY "Reactions viewable by authenticated users"
ON public.story_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM stories
  WHERE stories.id = story_reactions.story_id
  AND stories.expires_at > now()
));

-- Fix 5: Add post content length constraint at database level
ALTER TABLE public.posts ADD CONSTRAINT posts_content_length_check
CHECK (char_length(content) <= 500);
