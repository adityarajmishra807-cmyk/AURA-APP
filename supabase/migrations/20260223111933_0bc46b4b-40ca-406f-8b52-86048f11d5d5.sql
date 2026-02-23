
-- Create story_ratings table for AURIX rating system on stories (-5 to +5)
CREATE TABLE public.story_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one rating per user per story
CREATE UNIQUE INDEX idx_story_ratings_unique ON public.story_ratings (story_id, rater_id);

-- Enable RLS
ALTER TABLE public.story_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view story ratings"
  ON public.story_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert story ratings"
  ON public.story_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

-- Enable realtime for story_reactions so counts update live
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;

-- RPC: submit_story_rating (similar to submit_rating but for stories, -5 to +5)
CREATE OR REPLACE FUNCTION public.submit_story_rating(p_story_id uuid, p_value integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rater_id UUID;
  v_receiver_id UUID;
  v_abs_value INTEGER;
BEGIN
  v_rater_id := auth.uid();
  IF v_rater_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate rating value
  IF p_value < -5 OR p_value > 5 OR p_value = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between -5 and 5, and not zero');
  END IF;

  -- Get story owner
  SELECT user_id INTO v_receiver_id FROM stories WHERE id = p_story_id;
  IF v_receiver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Story not found');
  END IF;

  -- Cannot rate own story
  IF v_rater_id = v_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot rate your own story');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM story_ratings WHERE rater_id = v_rater_id AND story_id = p_story_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already rated this story');
  END IF;

  -- Insert rating
  INSERT INTO story_ratings (story_id, rater_id, receiver_id, value)
  VALUES (p_story_id, v_rater_id, v_receiver_id, p_value);

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

  -- Log transaction
  INSERT INTO aurix_transactions (user_id, amount, type, reference_id, description)
  VALUES (
    v_receiver_id,
    p_value,
    'story_rating',
    p_story_id,
    CASE WHEN p_value > 0 THEN 'Story rated +' || p_value || ' AURIX'
         ELSE 'Story rated -' || v_abs_value || ' AURIX'
    END
  );

  RETURN jsonb_build_object('success', true, 'value', p_value);
END;
$$;
