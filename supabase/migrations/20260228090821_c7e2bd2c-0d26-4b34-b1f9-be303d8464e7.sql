
DROP POLICY IF EXISTS "Shop items viewable by everyone" ON public.shop_items;
CREATE POLICY "Shop items viewable by everyone"
  ON public.shop_items FOR SELECT
  USING (active = true);
