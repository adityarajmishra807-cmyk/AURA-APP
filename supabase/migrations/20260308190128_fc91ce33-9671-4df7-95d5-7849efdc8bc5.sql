
-- ============================================
-- PERFORMANCE INDEXES FOR 100K+ USERS
-- ============================================

-- Posts: feed ordering & user lookups
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);

-- Ratings: post lookups, rater daily counts, abuse detection
CREATE INDEX IF NOT EXISTS idx_ratings_post_id ON public.ratings (post_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id_created ON public.ratings (rater_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_receiver_id ON public.ratings (receiver_id);

-- Post likes: count queries per post
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON public.post_likes (user_id, post_id);

-- Comments: per-post listing
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created ON public.comments (post_id, created_at DESC);

-- Friends: friendship lookups by status
CREATE INDEX IF NOT EXISTS idx_friends_requester ON public.friends (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON public.friends (addressee_id, status);

-- Messages: conversation message listing
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);

-- Conversations: participant lookups
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations (participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations (participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations (last_message_at DESC);

-- Notifications: user inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read, created_at DESC);

-- Profiles: leaderboard sorting, username lookups, college filtering
CREATE INDEX IF NOT EXISTS idx_profiles_aurix_balance_desc ON public.profiles (aurix_balance DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_college_aurix ON public.profiles (college_id, aurix_balance DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Stories: active stories feed
CREATE INDEX IF NOT EXISTS idx_stories_expires_user ON public.stories (expires_at DESC, user_id);

-- Story views/ratings
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views (story_id);
CREATE INDEX IF NOT EXISTS idx_story_ratings_story ON public.story_ratings (story_id);

-- Transfers: daily/monthly cap checks
CREATE INDEX IF NOT EXISTS idx_transfers_sender_created ON public.transfers (sender_id, created_at DESC);

-- Post media: per-post media
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media (post_id, position);

-- Post hashtags
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON public.post_hashtags (post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON public.post_hashtags (hashtag);

-- Calls: participant lookups
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls (caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls (receiver_id, status);

-- User achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id);

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals (referred_id);

-- User purchases
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON public.user_purchases (user_id, item_id);
