
-- Fix 1: Restrict profiles SELECT to authenticated users only (was public to anyone)
DROP POLICY "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Fix 2: Restrict ratings SELECT to authenticated users only (was public to anyone)
DROP POLICY "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Ratings viewable by authenticated users"
ON public.ratings FOR SELECT TO authenticated
USING (true);
