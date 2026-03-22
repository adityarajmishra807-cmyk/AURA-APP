
-- Fix the resolve_battle function - the loser INSERT had wrong column count
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

  IF v_battle.end_time > now() AND v_battle.mode != 'target' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle still in progress');
  END IF;

  -- Recalculate challenger scores
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

  -- Recalculate opponent scores
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

  -- Calculate final scores
  UPDATE battle_scores SET
    final_score = (avg_rating * 0.5) + (unique_raters * 0.3) + (engagement_score * 0.2)
  WHERE battle_id = p_battle_id;

  SELECT * INTO v_score1 FROM battle_scores WHERE battle_id = p_battle_id AND user_id = v_battle.challenger_id;
  SELECT * INTO v_score2 FROM battle_scores WHERE battle_id = p_battle_id AND user_id = v_battle.opponent_id;

  v_total_pool := v_battle.stake * 2;
  v_fee := CEIL(v_total_pool * 0.10);

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
    v_winner_share := FLOOR((v_total_pool - v_fee) / 2);

    UPDATE profiles SET
      aurix_balance = aurix_balance + v_winner_share,
      aurix_lifetime_earned = aurix_lifetime_earned + v_winner_share
    WHERE user_id IN (v_battle.challenger_id, v_battle.opponent_id);

    INSERT INTO aurix_transactions (user_id, amount, type, description) VALUES
    (v_battle.challenger_id, v_winner_share, 'battle_draw', 'Battle draw: +' || v_winner_share || ' AURIX'),
    (v_battle.opponent_id, v_winner_share, 'battle_draw', 'Battle draw: +' || v_winner_share || ' AURIX');

    UPDATE battles SET status = 'completed', platform_fee = v_fee WHERE id = p_battle_id;

    INSERT INTO battle_stats (user_id, total_battles, draws) VALUES (v_battle.challenger_id, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET total_battles = battle_stats.total_battles + 1, draws = battle_stats.draws + 1, win_streak = 0, updated_at = now();
    INSERT INTO battle_stats (user_id, total_battles, draws) VALUES (v_battle.opponent_id, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET total_battles = battle_stats.total_battles + 1, draws = battle_stats.draws + 1, win_streak = 0, updated_at = now();
  ELSE
    v_winner_share := v_total_pool - v_fee;

    UPDATE profiles SET
      aurix_balance = aurix_balance + v_winner_share,
      aurix_lifetime_earned = aurix_lifetime_earned + v_winner_share
    WHERE user_id = v_winner_id;

    INSERT INTO aurix_transactions (user_id, amount, type, description)
    VALUES (v_winner_id, v_winner_share, 'battle_win', 'Battle won! +' || v_winner_share || ' AURIX');

    UPDATE battles SET status = 'completed', winner_id = v_winner_id, platform_fee = v_fee WHERE id = p_battle_id;

    INSERT INTO battle_stats (user_id, total_battles, wins, win_streak, best_streak, total_earned)
    VALUES (v_winner_id, 1, 1, 1, 1, v_winner_share)
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = battle_stats.total_battles + 1,
      wins = battle_stats.wins + 1,
      win_streak = battle_stats.win_streak + 1,
      best_streak = GREATEST(battle_stats.best_streak, battle_stats.win_streak + 1),
      total_earned = battle_stats.total_earned + v_winner_share,
      updated_at = now();

    INSERT INTO battle_stats (user_id, total_battles, losses, total_lost)
    VALUES (v_loser_id, 1, 1, v_battle.stake)
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = battle_stats.total_battles + 1,
      losses = battle_stats.losses + 1,
      win_streak = 0,
      total_lost = battle_stats.total_lost + v_battle.stake,
      updated_at = now();

    INSERT INTO notifications (user_id, type, title, body, data) VALUES
    (v_winner_id, 'battle_won', '🏆 Battle Won!', 'You won ' || v_winner_share || ' AURIX!', jsonb_build_object('battle_id', p_battle_id, 'amount', v_winner_share)),
    (v_loser_id, 'battle_lost', '😔 Battle Lost', 'You lost your ' || v_battle.stake || ' AURIX stake.', jsonb_build_object('battle_id', p_battle_id));
  END IF;

  RETURN jsonb_build_object('success', true, 'winner_id', v_winner_id, 'draw', v_is_draw, 'pool', v_total_pool, 'fee', v_fee);
END;
$$;
