
-- =====================
-- COMMENTS TABLE
-- =====================
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT comments_content_length CHECK (char_length(content) <= 300)
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- =====================
-- NOTIFY ON COMMENT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.notify_on_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_commenter_username TEXT;
  v_post_owner_id UUID;
  v_post_content TEXT;
BEGIN
  SELECT username INTO v_commenter_username FROM profiles WHERE user_id = NEW.user_id;
  SELECT user_id, LEFT(content, 50) INTO v_post_owner_id, v_post_content FROM posts WHERE id = NEW.post_id;

  -- Don't notify if commenting on own post
  IF NEW.user_id = v_post_owner_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_post_owner_id,
    'comment',
    '💬 New Comment',
    '@' || v_commenter_username || ' commented on your post',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'commenter', v_commenter_username)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- =====================
-- ACHIEVEMENTS TABLE
-- =====================
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  threshold INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

-- =====================
-- USER ACHIEVEMENTS TABLE
-- =====================
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL REFERENCES public.achievements(key),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User achievements viewable by everyone"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can insert user achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);

-- =====================
-- SEED ACHIEVEMENTS
-- =====================
INSERT INTO public.achievements (key, name, description, icon, threshold) VALUES
  ('first_post', 'First Post', 'Created your first post', '📝', 1),
  ('social_butterfly', 'Social Butterfly', 'Made 10 friends', '🦋', 10),
  ('streak_week', 'Streak Week', 'Maintained a 7-day streak', '🔥', 7),
  ('streak_month', 'Streak Month', 'Maintained a 30-day streak', '💎', 30),
  ('century_rater', 'Century Rater', 'Given 100 ratings', '⭐', 100),
  ('aurix_rich', 'AURIX Rich', 'Reached 1000 AURIX balance', '💰', 1000),
  ('storyteller', 'Storyteller', 'Created 10 stories', '📖', 10),
  ('generous', 'Generous', 'Sent 10 transfers', '🎁', 10);

-- =====================
-- CHECK ACHIEVEMENTS FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.check_achievements()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_new_badges TEXT[] := '{}';
  v_count INTEGER;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = v_user_id;

  -- First Post
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'first_post') THEN
    SELECT COUNT(*) INTO v_count FROM posts WHERE user_id = v_user_id;
    IF v_count >= 1 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'first_post');
      v_new_badges := array_append(v_new_badges, 'first_post');
    END IF;
  END IF;

  -- Social Butterfly (10 friends)
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'social_butterfly') THEN
    SELECT COUNT(*) INTO v_count FROM friends WHERE (requester_id = v_user_id OR addressee_id = v_user_id) AND status = 'accepted';
    IF v_count >= 10 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'social_butterfly');
      v_new_badges := array_append(v_new_badges, 'social_butterfly');
    END IF;
  END IF;

  -- Streak Week
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'streak_week') THEN
    IF v_profile.highest_streak >= 7 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'streak_week');
      v_new_badges := array_append(v_new_badges, 'streak_week');
    END IF;
  END IF;

  -- Streak Month
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'streak_month') THEN
    IF v_profile.highest_streak >= 30 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'streak_month');
      v_new_badges := array_append(v_new_badges, 'streak_month');
    END IF;
  END IF;

  -- Century Rater
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'century_rater') THEN
    SELECT COUNT(*) INTO v_count FROM ratings WHERE rater_id = v_user_id;
    IF v_count >= 100 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'century_rater');
      v_new_badges := array_append(v_new_badges, 'century_rater');
    END IF;
  END IF;

  -- AURIX Rich
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'aurix_rich') THEN
    IF v_profile.aurix_balance >= 1000 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'aurix_rich');
      v_new_badges := array_append(v_new_badges, 'aurix_rich');
    END IF;
  END IF;

  -- Storyteller
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'storyteller') THEN
    SELECT COUNT(*) INTO v_count FROM stories WHERE user_id = v_user_id;
    IF v_count >= 10 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'storyteller');
      v_new_badges := array_append(v_new_badges, 'storyteller');
    END IF;
  END IF;

  -- Generous
  IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = v_user_id AND achievement_key = 'generous') THEN
    SELECT COUNT(*) INTO v_count FROM transfers WHERE sender_id = v_user_id;
    IF v_count >= 10 THEN
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (v_user_id, 'generous');
      v_new_badges := array_append(v_new_badges, 'generous');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_badges', to_jsonb(v_new_badges));
END;
$function$;
