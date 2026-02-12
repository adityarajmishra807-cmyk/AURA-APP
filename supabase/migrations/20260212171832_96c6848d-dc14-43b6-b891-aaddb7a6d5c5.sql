
-- Referrals table with milestone tracking
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_1_completed BOOLEAN NOT NULL DEFAULT false,
  stage_1_rewarded BOOLEAN NOT NULL DEFAULT false,
  stage_2_completed BOOLEAN NOT NULL DEFAULT false,
  stage_2_rewarded BOOLEAN NOT NULL DEFAULT false,
  stage_3_completed BOOLEAN NOT NULL DEFAULT false,
  stage_3_rewarded BOOLEAN NOT NULL DEFAULT false,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE INDEX idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals (referred_id);

-- Abuse logs table
CREATE TABLE public.abuse_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.abuse_logs ENABLE ROW LEVEL SECURITY;
-- No select policy for users — admin only via service role

CREATE INDEX idx_abuse_logs_user ON public.abuse_logs (user_id, created_at DESC);
CREATE INDEX idx_abuse_logs_severity ON public.abuse_logs (severity, created_at DESC);

-- Enable realtime on posts for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Function: Register a referral (called during signup with referral code)
CREATE OR REPLACE FUNCTION public.register_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_id UUID;
  v_referrer_id UUID;
  v_monthly_referrals INTEGER;
BEGIN
  v_referred_id := auth.uid();
  IF v_referred_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Already referred?
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = v_referred_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id FROM profiles WHERE referral_code = p_referral_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_id = v_referred_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check monthly cap (max 10 full referrals/month)
  SELECT COUNT(*) INTO v_monthly_referrals
  FROM referrals
  WHERE referrer_id = v_referrer_id
    AND created_at >= date_trunc('month', now());
  IF v_monthly_referrals >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer has reached monthly limit');
  END IF;

  -- Create referral record — Stage 1 auto-completes on signup+verification
  INSERT INTO referrals (referrer_id, referred_id, stage_1_completed) 
  VALUES (v_referrer_id, v_referred_id, true);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: Claim referral milestone rewards
CREATE OR REPLACE FUNCTION public.claim_referral_reward(p_referral_id UUID, p_stage INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referral RECORD;
  v_reward INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id AND referrer_id = v_user_id;
  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found');
  END IF;

  IF v_referral.revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral has been revoked');
  END IF;

  IF p_stage = 1 THEN
    IF NOT v_referral.stage_1_completed OR v_referral.stage_1_rewarded THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stage 1 not eligible');
    END IF;
    v_reward := 150;
    UPDATE referrals SET stage_1_rewarded = true WHERE id = p_referral_id;
  ELSIF p_stage = 2 THEN
    IF NOT v_referral.stage_2_completed OR v_referral.stage_2_rewarded THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stage 2 not eligible');
    END IF;
    v_reward := 250;
    UPDATE referrals SET stage_2_rewarded = true WHERE id = p_referral_id;
  ELSIF p_stage = 3 THEN
    IF NOT v_referral.stage_3_completed OR v_referral.stage_3_rewarded THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stage 3 not eligible');
    END IF;
    v_reward := 300;
    UPDATE referrals SET stage_3_rewarded = true WHERE id = p_referral_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stage');
  END IF;

  -- Award AURIX
  UPDATE profiles SET
    aurix_balance = aurix_balance + v_reward,
    aurix_lifetime_earned = aurix_lifetime_earned + v_reward
  WHERE user_id = v_user_id;

  INSERT INTO aurix_transactions (user_id, amount, type, reference_id, description)
  VALUES (v_user_id, v_reward, 'referral_reward', p_referral_id,
    'Referral stage ' || p_stage || ' reward: +' || v_reward || ' AURIX');

  RETURN jsonb_build_object('success', true, 'reward', v_reward, 'stage', p_stage);
END;
$$;

-- Function: Check and update referral milestones for a referred user
CREATE OR REPLACE FUNCTION public.check_referral_milestones()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referral RECORD;
  v_profile RECORD;
  v_has_post BOOLEAN;
  v_consecutive_days INTEGER;
  v_updated BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_referral FROM referrals WHERE referred_id = v_user_id;
  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', false, 'info', 'No referral found');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = v_user_id;

  -- Stage 2: Complete profile + first post + reach 100 AURIX
  IF NOT v_referral.stage_2_completed THEN
    SELECT EXISTS(SELECT 1 FROM posts WHERE user_id = v_user_id) INTO v_has_post;
    IF v_profile.college_id IS NOT NULL 
       AND v_has_post 
       AND v_profile.aurix_balance >= 100 THEN
      UPDATE referrals SET stage_2_completed = true WHERE id = v_referral.id;
      v_updated := true;
    END IF;
  END IF;

  -- Stage 3: 7 consecutive active days
  IF NOT v_referral.stage_3_completed THEN
    IF v_profile.streak_count >= 7 THEN
      UPDATE referrals SET stage_3_completed = true WHERE id = v_referral.id;
      v_updated := true;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

-- Function: Log suspicious activity
CREATE OR REPLACE FUNCTION public.log_abuse(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'low'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO abuse_logs (user_id, action, details, severity)
  VALUES (p_user_id, p_action, p_details, p_severity);
END;
$$;

-- Trigger: Detect rapid rating patterns (anti-abuse)
CREATE OR REPLACE FUNCTION public.check_rating_abuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- Check for rapid-fire ratings (more than 5 in 60 seconds)
  SELECT COUNT(*) INTO v_recent_count
  FROM ratings
  WHERE rater_id = NEW.rater_id
    AND created_at > now() - interval '60 seconds';

  IF v_recent_count > 5 THEN
    PERFORM log_abuse(
      NEW.rater_id,
      'rapid_rating',
      jsonb_build_object('count_last_60s', v_recent_count, 'post_id', NEW.post_id),
      'medium'
    );
  END IF;

  -- Check for targeted negative ratings (same receiver, many negatives)
  IF NEW.value < 0 THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM ratings
    WHERE rater_id = NEW.rater_id
      AND receiver_id = NEW.receiver_id
      AND value < 0
      AND created_at > now() - interval '24 hours';

    IF v_recent_count > 3 THEN
      PERFORM log_abuse(
        NEW.rater_id,
        'targeted_negative',
        jsonb_build_object('target_id', NEW.receiver_id, 'negative_count_24h', v_recent_count),
        'high'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_rating_abuse_trigger
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rating_abuse();
