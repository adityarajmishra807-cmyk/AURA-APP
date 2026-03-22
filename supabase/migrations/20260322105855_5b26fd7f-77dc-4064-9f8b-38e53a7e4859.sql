
-- Battle modes enum
CREATE TYPE public.battle_mode AS ENUM ('classic', 'blitz', 'target', 'theme');
CREATE TYPE public.battle_status AS ENUM ('pending', 'active', 'completed', 'cancelled', 'expired');

-- Battles table
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id),
  opponent_id UUID NOT NULL REFERENCES auth.users(id),
  stake INTEGER NOT NULL,
  mode battle_mode NOT NULL DEFAULT 'classic',
  status battle_status NOT NULL DEFAULT 'pending',
  theme TEXT,
  target_score INTEGER,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  winner_id UUID REFERENCES auth.users(id),
  platform_fee INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_stake CHECK (stake IN (10, 25, 50, 100)),
  CONSTRAINT different_players CHECK (challenger_id != opponent_id)
);

-- Battle scores table
CREATE TABLE public.battle_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  avg_rating NUMERIC(5,2) NOT NULL DEFAULT 0,
  unique_raters INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- Battle stats on profiles (win/loss tracking)
CREATE TABLE public.battle_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  total_battles INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_battles_challenger ON public.battles(challenger_id);
CREATE INDEX idx_battles_opponent ON public.battles(opponent_id);
CREATE INDEX idx_battles_status ON public.battles(status);
CREATE INDEX idx_battles_active ON public.battles(status) WHERE status = 'active';
CREATE INDEX idx_battle_scores_battle ON public.battle_scores(battle_id);
CREATE INDEX idx_battle_scores_user ON public.battle_scores(user_id);
CREATE INDEX idx_battle_stats_user ON public.battle_stats(user_id);

-- Enable RLS
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for battles
CREATE POLICY "Users can view battles they're in"
  ON public.battles FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id OR status = 'active');

CREATE POLICY "Users can create battles"
  ON public.battles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update battles"
  ON public.battles FOR UPDATE TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- RLS for battle_scores
CREATE POLICY "Anyone authenticated can view battle scores"
  ON public.battle_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System inserts battle scores"
  ON public.battle_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS for battle_stats
CREATE POLICY "Anyone can view battle stats"
  ON public.battle_stats FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.battle_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_scores;

-- ===== CORE RPCS =====

-- Create a battle challenge
CREATE OR REPLACE FUNCTION public.create_battle(
  p_opponent_id UUID,
  p_stake INTEGER,
  p_mode TEXT DEFAULT 'classic',
  p_theme TEXT DEFAULT NULL,
  p_target_score INTEGER DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_balance INTEGER;
  v_active_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_stake NOT IN (10, 25, 50, 100) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stake amount');
  END IF;

  IF v_user_id = p_opponent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot challenge yourself');
  END IF;

  -- Check balance
  SELECT aurix_balance INTO v_balance FROM profiles WHERE user_id = v_user_id;
  IF v_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AURIX');
  END IF;

  -- Max 3 active battles
  SELECT COUNT(*) INTO v_active_count FROM battles
  WHERE (challenger_id = v_user_id OR opponent_id = v_user_id)
  AND status IN ('pending', 'active');
  IF v_active_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 3 active battles allowed');
  END IF;

  -- Lock challenger stake
  UPDATE profiles SET
    aurix_balance = aurix_balance - p_stake,
    aurix_lifetime_lost = aurix_lifetime_lost + p_stake
  WHERE user_id = v_user_id;

  -- Log transaction
  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -p_stake, 'battle_stake', 'Battle stake locked: ' || p_stake || ' AURIX');

  -- Create battle
  INSERT INTO battles (challenger_id, opponent_id, stake, mode, theme, target_score)
  VALUES (v_user_id, p_opponent_id, p_stake, p_mode::battle_mode, p_theme, p_target_score);

  -- Notify opponent
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_opponent_id,
    'battle_challenge',
    '⚔️ Battle Challenge!',
    'You''ve been challenged to a ' || p_stake || ' AURIX battle!',
    jsonb_build_object('challenger_id', v_user_id, 'stake', p_stake, 'mode', p_mode)
  );

  RETURN jsonb_build_object('success', true, 'stake', p_stake);
END;
$$;

-- Accept a battle
CREATE OR REPLACE FUNCTION public.accept_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_battle RECORD;
  v_balance INTEGER;
  v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id AND opponent_id = v_user_id AND status = 'pending';
  IF v_battle IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found or not for you');
  END IF;

  -- Check balance
  SELECT aurix_balance INTO v_balance FROM profiles WHERE user_id = v_user_id;
  IF v_balance < v_battle.stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AURIX');
  END IF;

  -- Calculate end time based on mode
  v_end_time := CASE v_battle.mode
    WHEN 'classic' THEN now() + interval '24 hours'
    WHEN 'blitz' THEN now() + interval '1 hour'
    ELSE now() + interval '24 hours'
  END;

  -- Lock opponent stake
  UPDATE profiles SET
    aurix_balance = aurix_balance - v_battle.stake,
    aurix_lifetime_lost = aurix_lifetime_lost + v_battle.stake
  WHERE user_id = v_user_id;

  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -v_battle.stake, 'battle_stake', 'Battle stake locked: ' || v_battle.stake || ' AURIX');

  -- Activate battle
  UPDATE battles SET
    status = 'active',
    start_time = now(),
    end_time = v_end_time
  WHERE id = p_battle_id;

  -- Init scores
  INSERT INTO battle_scores (battle_id, user_id) VALUES (p_battle_id, v_battle.challenger_id);
  INSERT INTO battle_scores (battle_id, user_id) VALUES (p_battle_id, v_user_id);

  -- Notify challenger
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_battle.challenger_id,
    'battle_accepted',
    '⚔️ Battle Accepted!',
    'Your battle challenge has been accepted! Game on!',
    jsonb_build_object('battle_id', p_battle_id)
  );

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'end_time', v_end_time);
END;
$$;

-- Decline/cancel battle
CREATE OR REPLACE FUNCTION public.decline_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_battle RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id AND status = 'pending';
  IF v_battle IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found');
  END IF;

  -- Only challenger or opponent can cancel/decline
  IF v_user_id != v_battle.challenger_id AND v_user_id != v_battle.opponent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your battle');
  END IF;

  -- Refund challenger
  UPDATE profiles SET
    aurix_balance = aurix_balance + v_battle.stake,
    aurix_lifetime_lost = aurix_lifetime_lost - v_battle.stake
  WHERE user_id = v_battle.challenger_id;

  INSERT INTO aurix_transactions (user_id, amount, type, description)
  VALUES (v_battle.challenger_id, v_battle.stake, 'battle_refund', 'Battle stake refunded: ' || v_battle.stake || ' AURIX');

  UPDATE battles SET status = 'cancelled' WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Resolve battle (calculate winner)
CREATE OR REPLACE FUNCTION public.resolve_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_score1 RECORD;
  v_score2 RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  v_total_pool INTEGER;
  v_winner_share INTEGER;
  v_fee INTEGER;
  v_is_draw BOOLEAN := false;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id AND status = 'active';
  IF v_battle IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found or not active');
  END IF;

  -- Check if battle time is over
  IF v_battle.end_time > now() AND v_battle.mode != 'target' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle still in progress');
  END IF;

  -- Recalculate scores from actual data
  -- Player 1 (challenger)
  UPDATE battle_scores SET
    avg_rating = COALESCE((
      SELECT AVG(r.value)::NUMERIC(5,2) FROM ratings r
      JOIN posts p ON r.post_id = p.id
      WHERE p.user_id = v_battle.challenger_id
      AND r.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    unique_raters = COALESCE((
      SELECT COUNT(DISTINCT r.rater_id) FROM ratings r
      JOIN posts p ON r.post_id = p.id
      WHERE p.user_id = v_battle.challenger_id
      AND r.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    engagement_score = COALESCE((
      SELECT (COUNT(DISTINCT pl.id) + COUNT(DISTINCT c.id))::NUMERIC(5,2)
      FROM posts p
      LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
      LEFT JOIN comments c ON c.post_id = p.id AND c.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
      WHERE p.user_id = v_battle.challenger_id
      AND p.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    posts_count = COALESCE((
      SELECT COUNT(*) FROM posts WHERE user_id = v_battle.challenger_id
      AND created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0)
  WHERE battle_id = p_battle_id AND user_id = v_battle.challenger_id;

  -- Player 2 (opponent)
  UPDATE battle_scores SET
    avg_rating = COALESCE((
      SELECT AVG(r.value)::NUMERIC(5,2) FROM ratings r
      JOIN posts p ON r.post_id = p.id
      WHERE p.user_id = v_battle.opponent_id
      AND r.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    unique_raters = COALESCE((
      SELECT COUNT(DISTINCT r.rater_id) FROM ratings r
      JOIN posts p ON r.post_id = p.id
      WHERE p.user_id = v_battle.opponent_id
      AND r.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    engagement_score = COALESCE((
      SELECT (COUNT(DISTINCT pl.id) + COUNT(DISTINCT c.id))::NUMERIC(5,2)
      FROM posts p
      LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
      LEFT JOIN comments c ON c.post_id = p.id AND c.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
      WHERE p.user_id = v_battle.opponent_id
      AND p.created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0),
    posts_count = COALESCE((
      SELECT COUNT(*) FROM posts WHERE user_id = v_battle.opponent_id
      AND created_at BETWEEN v_battle.start_time AND COALESCE(v_battle.end_time, now())
    ), 0)
  WHERE battle_id = p_battle_id AND user_id = v_battle.opponent_id;

  -- Calculate final scores: (avg_rating * 0.5) + (unique_raters * 0.3) + (engagement * 0.2)
  UPDATE battle_scores SET
    final_score = (avg_rating * 0.5) + (unique_raters * 0.3) + (engagement_score * 0.2)
  WHERE battle_id = p_battle_id;

  -- Get scores
  SELECT * INTO v_score1 FROM battle_scores WHERE battle_id = p_battle_id AND user_id = v_battle.challenger_id;
  SELECT * INTO v_score2 FROM battle_scores WHERE battle_id = p_battle_id AND user_id = v_battle.opponent_id;

  v_total_pool := v_battle.stake * 2;
  v_fee := CEIL(v_total_pool * 0.10);

  -- Determine winner
  IF v_score1.final_score > v_score2.final_score THEN
    v_winner_id := v_battle.challenger_id;
    v_loser_id := v_battle.opponent_id;
  ELSIF v_score2.final_score > v_score1.final_score THEN
    v_winner_id := v_battle.opponent_id;
    v_loser_id := v_battle.challenger_id;
  ELSE
    v_is_draw := true;
  END IF;

  IF v_is_draw THEN
    -- Split pool minus fee
    v_winner_share := FLOOR((v_total_pool - v_fee) / 2);

    UPDATE profiles SET
      aurix_balance = aurix_balance + v_winner_share,
      aurix_lifetime_earned = aurix_lifetime_earned + v_winner_share
    WHERE user_id = v_battle.challenger_id;

    UPDATE profiles SET
      aurix_balance = aurix_balance + v_winner_share,
      aurix_lifetime_earned = aurix_lifetime_earned + v_winner_share
    WHERE user_id = v_battle.opponent_id;

    INSERT INTO aurix_transactions (user_id, amount, type, description) VALUES
    (v_battle.challenger_id, v_winner_share, 'battle_draw', 'Battle draw: +' || v_winner_share || ' AURIX'),
    (v_battle.opponent_id, v_winner_share, 'battle_draw', 'Battle draw: +' || v_winner_share || ' AURIX');

    UPDATE battles SET status = 'completed', platform_fee = v_fee WHERE id = p_battle_id;

    -- Update stats for both
    INSERT INTO battle_stats (user_id, total_battles, draws) VALUES (v_battle.challenger_id, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET total_battles = battle_stats.total_battles + 1, draws = battle_stats.draws + 1, win_streak = 0, updated_at = now();
    INSERT INTO battle_stats (user_id, total_battles, draws) VALUES (v_battle.opponent_id, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET total_battles = battle_stats.total_battles + 1, draws = battle_stats.draws + 1, win_streak = 0, updated_at = now();
  ELSE
    v_winner_share := v_total_pool - v_fee;

    -- Pay winner
    UPDATE profiles SET
      aurix_balance = aurix_balance + v_winner_share,
      aurix_lifetime_earned = aurix_lifetime_earned + v_winner_share
    WHERE user_id = v_winner_id;

    INSERT INTO aurix_transactions (user_id, amount, type, description)
    VALUES (v_winner_id, v_winner_share, 'battle_win', 'Battle won! +' || v_winner_share || ' AURIX');

    UPDATE battles SET status = 'completed', winner_id = v_winner_id, platform_fee = v_fee WHERE id = p_battle_id;

    -- Update winner stats
    INSERT INTO battle_stats (user_id, total_battles, wins, win_streak, best_streak, total_earned)
    VALUES (v_winner_id, 1, 1, 1, 1, v_winner_share)
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = battle_stats.total_battles + 1,
      wins = battle_stats.wins + 1,
      win_streak = battle_stats.win_streak + 1,
      best_streak = GREATEST(battle_stats.best_streak, battle_stats.win_streak + 1),
      total_earned = battle_stats.total_earned + v_winner_share,
      updated_at = now();

    -- Update loser stats
    INSERT INTO battle_stats (user_id, total_battles, losses, total_lost)
    VALUES (v_loser_id, 1, 0, 0, v_battle.stake)
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = battle_stats.total_battles + 1,
      losses = battle_stats.losses + 1,
      win_streak = 0,
      total_lost = battle_stats.total_lost + v_battle.stake,
      updated_at = now();

    -- Notifications
    INSERT INTO notifications (user_id, type, title, body, data) VALUES
    (v_winner_id, 'battle_won', '🏆 Battle Won!', 'You won ' || v_winner_share || ' AURIX!', jsonb_build_object('battle_id', p_battle_id, 'amount', v_winner_share)),
    (v_loser_id, 'battle_lost', '😔 Battle Lost', 'You lost your ' || v_battle.stake || ' AURIX stake.', jsonb_build_object('battle_id', p_battle_id));
  END IF;

  RETURN jsonb_build_object('success', true, 'winner_id', v_winner_id, 'draw', v_is_draw, 'pool', v_total_pool, 'fee', v_fee);
END;
$$;
