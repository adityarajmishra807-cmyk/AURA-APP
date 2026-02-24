import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "frame" | "name_color" | "theme" | "badge";
  price: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  preview_value: string;
  is_permanent: boolean;
  duration_days: number | null;
}

export interface UserCosmetics {
  equipped_frame: string | null;
  equipped_name_color: string | null;
  equipped_theme: string | null;
  equipped_badge: string | null;
}

export function useShop() {
  const { user, refreshProfile } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("shop_items")
      .select("id, name, description, category, price, rarity, preview_value, is_permanent, duration_days")
      .eq("active", true)
      .order("price", { ascending: true });
    if (data) setItems(data as ShopItem[]);
  }, []);

  const fetchOwned = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_purchases")
      .select("item_id, expires_at")
      .eq("user_id", user.id);
    if (data) {
      const activeIds = new Set(
        data
          .filter((p: any) => !p.expires_at || new Date(p.expires_at) > new Date())
          .map((p: any) => p.item_id)
      );
      setOwnedIds(activeIds);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([fetchItems(), fetchOwned()]).then(() => setLoading(false));
  }, [fetchItems, fetchOwned]);

  const purchase = useCallback(async (itemId: string) => {
    const { data, error } = await supabase.rpc("purchase_shop_item", { p_item_id: itemId });
    const result = data as any;
    if (error || !result?.success) {
      return { success: false, error: result?.error || "Purchase failed" };
    }
    await Promise.all([fetchOwned(), refreshProfile()]);
    return { success: true, item: result.item, price: result.price };
  }, [fetchOwned, refreshProfile]);

  const equip = useCallback(async (itemId: string) => {
    const { data, error } = await supabase.rpc("equip_shop_item", { p_item_id: itemId });
    const result = data as any;
    if (error || !result?.success) {
      return { success: false, error: result?.error || "Equip failed" };
    }
    await refreshProfile();
    return { success: true };
  }, [refreshProfile]);

  const unequip = useCallback(async (category: string) => {
    const { data, error } = await supabase.rpc("unequip_shop_item", { p_category: category });
    const result = data as any;
    if (error || !result?.success) {
      return { success: false, error: result?.error || "Unequip failed" };
    }
    await refreshProfile();
    return { success: true };
  }, [refreshProfile]);

  return { items, ownedIds, loading, purchase, equip, unequip, refresh: () => Promise.all([fetchItems(), fetchOwned()]) };
}
