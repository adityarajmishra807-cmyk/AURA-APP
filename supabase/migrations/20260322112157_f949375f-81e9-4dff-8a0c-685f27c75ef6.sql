ALTER TABLE public.aurix_transactions
DROP CONSTRAINT IF EXISTS aurix_transactions_type_check;

ALTER TABLE public.aurix_transactions
ADD CONSTRAINT aurix_transactions_type_check
CHECK (
  type IN (
    'rating_received',
    'rating_given',
    'post_reward',
    'streak_bonus',
    'transfer_sent',
    'transfer_received',
    'referral_reward',
    'shop_purchase',
    'story_rating',
    'battle_stake',
    'battle_refund',
    'battle_win',
    'battle_draw'
  )
);