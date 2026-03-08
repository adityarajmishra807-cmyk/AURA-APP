
-- Fix: user_achievements SELECT to authenticated only
DROP POLICY IF EXISTS "User achievements viewable by everyone" ON public.user_achievements;
CREATE POLICY "User achievements viewable by authenticated"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (true);

-- Fix: post_media SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view post media" ON public.post_media;
CREATE POLICY "Authenticated users can view post media"
ON public.post_media
FOR SELECT
TO authenticated
USING (true);

-- Fix: post_hashtags SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view post hashtags" ON public.post_hashtags;
CREATE POLICY "Authenticated users can view post hashtags"
ON public.post_hashtags
FOR SELECT
TO authenticated
USING (true);
