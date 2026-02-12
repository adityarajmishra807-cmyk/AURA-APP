
-- Transfers table
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  fee INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create transfers"
  ON public.transfers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX idx_transfers_sender ON public.transfers (sender_id, created_at DESC);
CREATE INDEX idx_transfers_receiver ON public.transfers (receiver_id, created_at DESC);

-- Function: Transfer AURIX to another user
CREATE OR REPLACE FUNCTION public.transfer_aurix(
  p_receiver_username TEXT,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_sender_balance INTEGER;
  v_fee INTEGER;
  v_net_amount INTEGER;
  v_today DATE := CURRENT_DATE;
  v_daily_sent INTEGER;
  v_monthly_sent INTEGER;
  v_account_age INTERVAL;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount <= 0 OR p_amount > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be between 1 and 50');
  END IF;

  -- Get receiver
  SELECT user_id INTO v_receiver_id FROM profiles WHERE username = p_receiver_username;
  IF v_receiver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_sender_id = v_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Check account age (min 3 days)
  SELECT (now() - created_at) INTO v_account_age FROM profiles WHERE user_id = v_sender_id;
  IF v_account_age < interval '3 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account must be at least 3 days old to transfer');
  END IF;

  -- Check balance
  SELECT aurix_balance INTO v_sender_balance FROM profiles WHERE user_id = v_sender_id;
  v_fee := CEIL(p_amount * 0.05);
  v_net_amount := p_amount - v_fee;

  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AURIX balance');
  END IF;

  -- Daily limit (50/day)
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_sent
  FROM transfers WHERE sender_id = v_sender_id AND created_at::date = v_today;
  IF v_daily_sent + p_amount > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Daily transfer limit reached (50/day)');
  END IF;

  -- Monthly limit (500/month)
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_sent
  FROM transfers WHERE sender_id = v_sender_id
    AND created_at >= date_trunc('month', now());
  IF v_monthly_sent + p_amount > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monthly transfer limit reached (500/month)');
  END IF;

  -- Execute transfer
  UPDATE profiles SET aurix_balance = aurix_balance - p_amount WHERE user_id = v_sender_id;
  UPDATE profiles SET aurix_balance = aurix_balance + v_net_amount,
    aurix_lifetime_earned = aurix_lifetime_earned + v_net_amount
  WHERE user_id = v_receiver_id;

  INSERT INTO transfers (sender_id, receiver_id, amount, fee) VALUES (v_sender_id, v_receiver_id, p_amount, v_fee);

  -- Log transactions
  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_sender_id, -p_amount, 'transfer_sent', 'Sent ' || p_amount || ' AURIX to @' || p_receiver_username || ' (fee: ' || v_fee || ')');
  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_receiver_id, v_net_amount, 'transfer_received', 'Received ' || v_net_amount || ' AURIX via transfer');

  RETURN jsonb_build_object('success', true, 'sent', p_amount, 'fee', v_fee, 'received', v_net_amount);
END;
$$;

-- Function: Claim daily streak bonus
CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_login DATE;
  v_streak INTEGER;
  v_bonus INTEGER := 5;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT last_login_date, streak_count INTO v_last_login, v_streak
  FROM profiles WHERE user_id = v_user_id;

  -- Already claimed today
  IF v_last_login = v_today THEN
    RETURN jsonb_build_object('success', false, 'already_claimed', true, 'streak', v_streak);
  END IF;

  -- Check if streak continues or resets
  IF v_last_login = v_today - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  -- Streak bonuses
  IF v_streak = 7 THEN v_bonus := v_bonus + 25; END IF;
  IF v_streak = 30 THEN v_bonus := v_bonus + 100; END IF;

  UPDATE profiles SET
    last_login_date = v_today,
    streak_count = v_streak,
    highest_streak = GREATEST(highest_streak, v_streak),
    aurix_balance = aurix_balance + v_bonus,
    aurix_lifetime_earned = aurix_lifetime_earned + v_bonus,
    aurix_daily_earnings = aurix_daily_earnings + v_bonus
  WHERE user_id = v_user_id;

  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_bonus, 'streak_bonus',
    'Daily login streak: day ' || v_streak || ' (+' || v_bonus || ' AURIX)');

  RETURN jsonb_build_object('success', true, 'streak', v_streak, 'bonus', v_bonus);
END;
$$;

-- Function: Get global leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  rank BIGINT,
  username TEXT,
  avatar_url TEXT,
  aurix_balance INTEGER,
  college_id UUID,
  streak_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.aurix_balance DESC) as rank,
    p.username,
    p.avatar_url,
    p.aurix_balance,
    p.college_id,
    p.streak_count
  FROM profiles p
  WHERE p.college_id IS NOT NULL
  ORDER BY p.aurix_balance DESC
  LIMIT p_limit;
$$;

-- Function: Get college leaderboard
CREATE OR REPLACE FUNCTION public.get_college_leaderboard(p_college_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  rank BIGINT,
  username TEXT,
  avatar_url TEXT,
  aurix_balance INTEGER,
  streak_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.aurix_balance DESC) as rank,
    p.username,
    p.avatar_url,
    p.aurix_balance,
    p.streak_count
  FROM profiles p
  WHERE p.college_id = p_college_id
  ORDER BY p.aurix_balance DESC
  LIMIT p_limit;
$$;
