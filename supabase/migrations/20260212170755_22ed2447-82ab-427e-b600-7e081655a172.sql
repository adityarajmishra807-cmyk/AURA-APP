
-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  aurix_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_posts_user ON public.posts (user_id);
CREATE INDEX idx_posts_created ON public.posts (created_at DESC);

-- Ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value >= -10 AND value <= 10 AND value != 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (rater_id, post_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON public.ratings FOR SELECT USING (true);

CREATE POLICY "Users can insert ratings"
  ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE INDEX idx_ratings_post ON public.ratings (post_id);
CREATE INDEX idx_ratings_rater ON public.ratings (rater_id);
CREATE INDEX idx_ratings_receiver ON public.ratings (receiver_id);

-- AURIX Transaction Log
CREATE TABLE public.aurix_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rating_received', 'rating_given', 'post_reward', 'streak_bonus', 'transfer_sent', 'transfer_received', 'referral_reward')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.aurix_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.aurix_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.aurix_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_transactions_user ON public.aurix_transactions (user_id, created_at DESC);

-- Post images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function: Submit a rating with all business logic
CREATE OR REPLACE FUNCTION public.submit_rating(
  p_post_id UUID,
  p_value INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rater_id UUID;
  v_receiver_id UUID;
  v_today DATE := CURRENT_DATE;
  v_daily_ratings_count INTEGER;
  v_daily_negative_given INTEGER;
  v_abs_value INTEGER;
BEGIN
  v_rater_id := auth.uid();
  
  IF v_rater_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate rating value
  IF p_value < -10 OR p_value > 10 OR p_value = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between -10 and 10, and not zero');
  END IF;

  -- Get post owner
  SELECT user_id INTO v_receiver_id FROM posts WHERE id = p_post_id;
  IF v_receiver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Cannot rate own post
  IF v_rater_id = v_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot rate your own post');
  END IF;

  -- Check duplicate rating
  IF EXISTS (SELECT 1 FROM ratings WHERE rater_id = v_rater_id AND post_id = p_post_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already rated this post');
  END IF;

  -- Check daily rating limit (max 20)
  SELECT COUNT(*) INTO v_daily_ratings_count
  FROM ratings
  WHERE rater_id = v_rater_id AND created_at::date = v_today;
  
  IF v_daily_ratings_count >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily rating limit reached (20/day)');
  END IF;

  -- Check daily negative damage cap (-50 max impact per day)
  IF p_value < 0 THEN
    SELECT COALESCE(SUM(ABS(value)), 0) INTO v_daily_negative_given
    FROM ratings
    WHERE rater_id = v_rater_id AND value < 0 AND created_at::date = v_today;
    
    IF v_daily_negative_given + ABS(p_value) > 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Daily negative impact limit reached (-50/day)');
    END IF;
  END IF;

  -- Insert rating
  INSERT INTO ratings (rater_id, receiver_id, post_id, value)
  VALUES (v_rater_id, v_receiver_id, p_post_id, p_value);

  -- Update receiver AURIX balance
  v_abs_value := ABS(p_value);
  
  IF p_value > 0 THEN
    UPDATE profiles SET
      aurix_balance = aurix_balance + p_value,
      aurix_lifetime_earned = aurix_lifetime_earned + p_value,
      aurix_daily_earnings = aurix_daily_earnings + p_value
    WHERE user_id = v_receiver_id;
  ELSE
    UPDATE profiles SET
      aurix_balance = GREATEST(aurix_balance + p_value, 0),
      aurix_lifetime_lost = aurix_lifetime_lost + v_abs_value,
      aurix_daily_losses = aurix_daily_losses + v_abs_value
    WHERE user_id = v_receiver_id;
  END IF;

  -- Log transaction for receiver
  INSERT INTO aurix_transactions (user_id, amount, type, reference_id, description)
  VALUES (
    v_receiver_id,
    p_value,
    'rating_received',
    p_post_id,
    CASE WHEN p_value > 0 THEN 'Received +' || p_value || ' AURIX from a rating'
         ELSE 'Lost ' || v_abs_value || ' AURIX from a rating'
    END
  );

  RETURN jsonb_build_object('success', true, 'value', p_value);
END;
$$;

-- Function: Claim daily post reward (+10 AURIX for first post of the day)
CREATE OR REPLACE FUNCTION public.claim_post_reward(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_already_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user already got daily post reward
  SELECT EXISTS(
    SELECT 1 FROM posts
    WHERE user_id = v_user_id
      AND aurix_reward_claimed = true
      AND created_at::date = v_today
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object('success', false, 'already_claimed', true);
  END IF;

  -- Mark post as reward claimed
  UPDATE posts SET aurix_reward_claimed = true WHERE id = p_post_id AND user_id = v_user_id;

  -- Award +10 AURIX
  UPDATE profiles SET
    aurix_balance = aurix_balance + 10,
    aurix_lifetime_earned = aurix_lifetime_earned + 10,
    aurix_daily_earnings = aurix_daily_earnings + 10
  WHERE user_id = v_user_id;

  -- Log transaction
  INSERT INTO aurix_transactions (user_id, amount, type, reference_id, description)
  VALUES (v_user_id, 10, 'post_reward', p_post_id, 'Daily first post reward: +10 AURIX');

  RETURN jsonb_build_object('success', true, 'reward', 10);
END;
$$;
