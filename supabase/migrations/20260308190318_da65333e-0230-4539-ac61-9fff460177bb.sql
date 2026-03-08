
-- Revoke direct API access to the materialized view
REVOKE ALL ON public.leaderboard_cache FROM anon, authenticated;
