import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CosmeticData {
  frame?: string | null;
  nameColor?: string | null;
  theme?: string | null;
  badge?: string | null;
}

const cosmeticsCache = new Map<string, CosmeticData>();

export function useCosmetics(userId: string | undefined) {
  const [cosmetics, setCosmetics] = useState<CosmeticData>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Check cache
    if (cosmeticsCache.has(userId)) {
      setCosmetics(cosmeticsCache.get(userId)!);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("equipped_frame, equipped_name_color, equipped_theme, equipped_badge")
      .eq("user_id", userId)
      .single();

    if (!profile) { setLoading(false); return; }

    const itemIds = [profile.equipped_frame, profile.equipped_name_color, profile.equipped_theme, profile.equipped_badge].filter(Boolean);

    let itemMap: Record<string, { category: string; preview_value: string }> = {};
    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from("shop_items")
        .select("id, category, preview_value")
        .in("id", itemIds);
      items?.forEach((item: any) => { itemMap[item.id] = item; });
    }

    const result: CosmeticData = {
      frame: profile.equipped_frame ? itemMap[profile.equipped_frame]?.preview_value : null,
      nameColor: profile.equipped_name_color ? itemMap[profile.equipped_name_color]?.preview_value : null,
      theme: profile.equipped_theme ? itemMap[profile.equipped_theme]?.preview_value : null,
      badge: profile.equipped_badge ? itemMap[profile.equipped_badge]?.preview_value : null,
    };

    cosmeticsCache.set(userId, result);
    setCosmetics(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { cosmetics, loading, refresh: fetch };
}

// Clear cache for a user (call after equipping/unequipping)
export function clearCosmeticsCache(userId?: string) {
  if (userId) cosmeticsCache.delete(userId);
  else cosmeticsCache.clear();
}
