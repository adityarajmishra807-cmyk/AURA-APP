
-- Drop restrictive policies on post_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
DROP POLICY IF EXISTS "Users can add likes" ON post_likes;
DROP POLICY IF EXISTS "Users can remove likes" ON post_likes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can add likes" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);
