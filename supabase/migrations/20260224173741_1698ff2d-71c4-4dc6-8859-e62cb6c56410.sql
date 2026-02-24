ALTER TABLE public.aurix_transactions DROP CONSTRAINT aurix_transactions_type_check;

ALTER TABLE public.aurix_transactions ADD CONSTRAINT aurix_transactions_type_check
CHECK (type = ANY (ARRAY['rating_received', 'rating_given', 'post_reward', 'streak_bonus', 'transfer_sent', 'transfer_received', 'referral_reward', 'shop_purchase', 'story_rating']));