
-- =====================
-- SHOP ITEMS TABLE
-- =====================
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'frame', 'name_color', 'theme', 'badge'
  price INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  preview_value TEXT NOT NULL, -- CSS value or emoji for the cosmetic
  is_permanent BOOLEAN NOT NULL DEFAULT true,
  duration_days INTEGER, -- NULL for permanent, otherwise days until expiry
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop items viewable by everyone"
  ON public.shop_items FOR SELECT
  USING (active = true);

-- =====================
-- USER PURCHASES TABLE
-- =====================
CREATE TABLE public.user_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id),
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE -- NULL for permanent
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.user_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert purchases"
  ON public.user_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_purchases_user_id ON public.user_purchases(user_id);
CREATE INDEX idx_user_purchases_item_id ON public.user_purchases(item_id);

-- =====================
-- ADD EQUIPPED COSMETICS TO PROFILES
-- =====================
ALTER TABLE public.profiles
  ADD COLUMN equipped_frame UUID REFERENCES public.shop_items(id),
  ADD COLUMN equipped_name_color UUID REFERENCES public.shop_items(id),
  ADD COLUMN equipped_theme UUID REFERENCES public.shop_items(id),
  ADD COLUMN equipped_badge UUID REFERENCES public.shop_items(id);

-- =====================
-- PURCHASE FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_balance INTEGER;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get item
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND active = true;
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Check if already owns (permanent items only)
  IF v_item.is_permanent THEN
    IF EXISTS (SELECT 1 FROM user_purchases WHERE user_id = v_user_id AND item_id = p_item_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already owned');
    END IF;
  ELSE
    -- For time-limited, check if active purchase exists
    IF EXISTS (
      SELECT 1 FROM user_purchases 
      WHERE user_id = v_user_id AND item_id = p_item_id AND expires_at > now()
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already active');
    END IF;
  END IF;

  -- Check balance
  SELECT aurix_balance INTO v_balance FROM profiles WHERE user_id = v_user_id;
  IF v_balance < v_item.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AURIX');
  END IF;

  -- Calculate expiry
  IF v_item.is_permanent THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (v_item.duration_days || ' days')::interval;
  END IF;

  -- Deduct balance
  UPDATE profiles SET
    aurix_balance = aurix_balance - v_item.price,
    aurix_lifetime_lost = aurix_lifetime_lost + v_item.price
  WHERE user_id = v_user_id;

  -- Record purchase
  INSERT INTO user_purchases (user_id, item_id, expires_at)
  VALUES (v_user_id, p_item_id, v_expires_at);

  -- Log transaction
  INSERT INTO aurix_transactions (user_id, amount, type, reference_id, description)
  VALUES (v_user_id, -v_item.price, 'shop_purchase', p_item_id,
    'Purchased ' || v_item.name || ' for ' || v_item.price || ' AURIX');

  RETURN jsonb_build_object('success', true, 'item', v_item.name, 'price', v_item.price);
END;
$function$;

-- =====================
-- EQUIP ITEM FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.equip_shop_item(p_item_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_owns BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get item
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id;
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Check ownership (active purchase)
  SELECT EXISTS(
    SELECT 1 FROM user_purchases 
    WHERE user_id = v_user_id AND item_id = p_item_id 
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_owns;

  IF NOT v_owns THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned or expired');
  END IF;

  -- Equip based on category
  IF v_item.category = 'frame' THEN
    UPDATE profiles SET equipped_frame = p_item_id WHERE user_id = v_user_id;
  ELSIF v_item.category = 'name_color' THEN
    UPDATE profiles SET equipped_name_color = p_item_id WHERE user_id = v_user_id;
  ELSIF v_item.category = 'theme' THEN
    UPDATE profiles SET equipped_theme = p_item_id WHERE user_id = v_user_id;
  ELSIF v_item.category = 'badge' THEN
    UPDATE profiles SET equipped_badge = p_item_id WHERE user_id = v_user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown category');
  END IF;

  RETURN jsonb_build_object('success', true, 'equipped', v_item.name);
END;
$function$;

-- =====================
-- UNEQUIP FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.unequip_shop_item(p_category text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_category = 'frame' THEN
    UPDATE profiles SET equipped_frame = NULL WHERE user_id = v_user_id;
  ELSIF p_category = 'name_color' THEN
    UPDATE profiles SET equipped_name_color = NULL WHERE user_id = v_user_id;
  ELSIF p_category = 'theme' THEN
    UPDATE profiles SET equipped_theme = NULL WHERE user_id = v_user_id;
  ELSIF p_category = 'badge' THEN
    UPDATE profiles SET equipped_badge = NULL WHERE user_id = v_user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown category');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- =====================
-- SEED SHOP ITEMS
-- =====================
INSERT INTO public.shop_items (name, description, category, price, rarity, preview_value, is_permanent, duration_days) VALUES
  -- FRAMES (permanent)
  ('Golden Ring', 'A shimmering gold border around your avatar', 'frame', 200, 'rare', 'ring-2 ring-yellow-400', true, NULL),
  ('Neon Pulse', 'Electric neon glow effect on your avatar', 'frame', 350, 'epic', 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]', true, NULL),
  ('Flame Border', 'Fiery animated border for your avatar', 'frame', 500, 'legendary', 'ring-2 ring-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.7)]', true, NULL),
  ('Diamond Edge', 'Pristine diamond-cut border', 'frame', 150, 'common', 'ring-2 ring-blue-300', true, NULL),
  ('Rose Aura', 'Soft pink glow around your avatar', 'frame', 100, 'common', 'ring-2 ring-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]', true, NULL),

  -- NAME COLORS (permanent)
  ('Sunset Gradient', 'Orange-to-pink gradient username', 'name_color', 250, 'rare', 'bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent', true, NULL),
  ('Ocean Wave', 'Blue-to-cyan gradient username', 'name_color', 250, 'rare', 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent', true, NULL),
  ('Royal Purple', 'Rich purple gradient username', 'name_color', 300, 'epic', 'bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent', true, NULL),
  ('Golden Text', 'Luxurious gold username', 'name_color', 400, 'legendary', 'bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent', true, NULL),
  ('Mint Fresh', 'Cool mint green username', 'name_color', 150, 'common', 'text-emerald-400', true, NULL),

  -- THEMES (time-limited, 30 days)
  ('Midnight Galaxy', 'Deep space themed profile background', 'theme', 100, 'rare', 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900', false, 30),
  ('Sunset Beach', 'Warm sunset gradient profile', 'theme', 100, 'rare', 'bg-gradient-to-br from-orange-900 via-rose-900 to-purple-900', false, 30),
  ('Arctic Frost', 'Cool icy blue profile theme', 'theme', 80, 'common', 'bg-gradient-to-br from-cyan-950 via-blue-900 to-slate-900', false, 30),
  ('Forest Depths', 'Lush green forest theme', 'theme', 80, 'common', 'bg-gradient-to-br from-emerald-950 via-green-900 to-teal-900', false, 30),

  -- EXCLUSIVE BADGES (permanent)
  ('⚡ Electrified', 'Show everyone you''re high-energy', 'badge', 300, 'epic', '⚡', true, NULL),
  ('👑 Crown', 'The ultimate status symbol', 'badge', 750, 'legendary', '👑', true, NULL),
  ('💫 Cosmic', 'Out of this world vibes', 'badge', 200, 'rare', '💫', true, NULL),
  ('🌊 Wave', 'Go with the flow', 'badge', 100, 'common', '🌊', true, NULL),
  ('🔮 Oracle', 'Mysterious and wise', 'badge', 400, 'epic', '🔮', true, NULL);
