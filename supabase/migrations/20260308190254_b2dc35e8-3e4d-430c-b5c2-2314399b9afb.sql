
-- Create materialized view for global leaderboard (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_cache AS
SELECT
  ROW_NUMBER() OVER (ORDER BY p.aurix_balance DESC) AS rank,
  p.username,
  p.avatar_url,
  p.aurix_balance,
  p.college_id,
  p.streak_count,
  p.user_id
FROM profiles p
WHERE p.college_id IS NOT NULL
ORDER BY p.aurix_balance DESC
LIMIT 500;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON public.leaderboard_cache (rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_college ON public.leaderboard_cache (college_id, rank);

-- Replace get_leaderboard to read from cache
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 100)
RETURNS TABLE(rank bigint, username text, avatar_url text, aurix_balance integer, college_id uuid, streak_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rank, username, avatar_url, aurix_balance, college_id, streak_count
  FROM leaderboard_cache
  ORDER BY rank
  LIMIT p_limit;
$$;

-- Replace get_college_leaderboard to use cache
CREATE OR REPLACE FUNCTION public.get_college_leaderboard(p_college_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE(rank bigint, username text, avatar_url text, aurix_balance integer, streak_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY aurix_balance DESC) AS rank,
    username, avatar_url, aurix_balance, streak_count
  FROM leaderboard_cache
  WHERE college_id = p_college_id
  ORDER BY aurix_balance DESC
  LIMIT p_limit;
$$;

-- Function to refresh leaderboard cache (called by cron)
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
$$;
