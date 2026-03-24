
CREATE TABLE public.daily_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  spun_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins" ON public.daily_spins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own spins" ON public.daily_spins
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_daily_spins_user_date ON public.daily_spins (user_id, spun_at DESC);

CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_spin timestamptz;
  v_roll integer;
  v_reward_type text;
  v_reward_amount integer;
  v_streak integer;
  v_streak_bonus numeric;
  v_final_amount integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT spun_at INTO v_last_spin
  FROM daily_spins
  WHERE user_id = v_user_id
  ORDER BY spun_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL AND v_last_spin > now() - interval '24 hours' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cooldown',
      'next_spin_at', (v_last_spin + interval '24 hours')
    );
  END IF;

  SELECT COALESCE(streak_count, 0) INTO v_streak FROM profiles WHERE user_id = v_user_id;
  v_streak_bonus := 1.0 + LEAST(COALESCE(v_streak, 0), 30) * 0.01;

  v_roll := floor(random() * 100)::integer;

  IF v_roll < 40 THEN
    v_reward_type := 'aurix_10'; v_reward_amount := 10;
  ELSIF v_roll < 65 THEN
    v_reward_type := 'aurix_25'; v_reward_amount := 25;
  ELSIF v_roll < 80 THEN
    v_reward_type := 'aurix_50'; v_reward_amount := 50;
  ELSIF v_roll < 85 THEN
    v_reward_type := 'aurix_100'; v_reward_amount := 100;
  ELSIF v_roll < 93 THEN
    v_reward_type := '2x_boost'; v_reward_amount := 0;
  ELSIF v_roll < 98 THEN
    v_reward_type := 'visibility_boost'; v_reward_amount := 0;
  ELSE
    v_reward_type := 'mystery'; v_reward_amount := floor(random() * 150 + 10)::integer;
  END IF;

  IF v_reward_amount > 0 THEN
    v_final_amount := ceil(v_reward_amount * v_streak_bonus)::integer;
  ELSE
    v_final_amount := 0;
  END IF;

  INSERT INTO daily_spins (user_id, reward_type, reward_amount, spun_at)
  VALUES (v_user_id, v_reward_type, v_final_amount, now());

  IF v_final_amount > 0 THEN
    UPDATE profiles SET aurix_balance = aurix_balance + v_final_amount WHERE user_id = v_user_id;
    INSERT INTO aurix_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_final_amount, 'spin_reward', 'Daily spin: ' || v_reward_type);
  END IF;

  RETURN json_build_object(
    'success', true,
    'reward_type', v_reward_type,
    'reward_amount', v_final_amount,
    'streak_bonus', round((v_streak_bonus - 1) * 100)::integer
  );
END;
$$;
