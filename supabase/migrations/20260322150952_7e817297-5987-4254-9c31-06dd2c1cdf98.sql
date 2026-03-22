
-- Replace get_leaderboard to query profiles directly (no stale cache)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 100)
RETURNS TABLE(rank bigint, username text, avatar_url text, aurix_balance integer, college_id uuid, streak_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.aurix_balance DESC) AS rank,
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

-- Replace get_college_leaderboard to query profiles directly
CREATE OR REPLACE FUNCTION public.get_college_leaderboard(p_college_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE(rank bigint, username text, avatar_url text, aurix_balance integer, streak_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.aurix_balance DESC) AS rank,
    p.username,
    p.avatar_url,
    p.aurix_balance,
    p.streak_count
  FROM profiles p
  WHERE p.college_id = p_college_id
  ORDER BY p.aurix_balance DESC
  LIMIT p_limit;
$$;
