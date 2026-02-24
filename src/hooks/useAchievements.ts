import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAchievements() {
  const { user } = useAuth();

  const checkAchievements = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("check_achievements");
    const result = data as any;
    if (error || !result?.success) return;

    const newBadges = result.new_badges as string[];
    if (newBadges && newBadges.length > 0) {
      // Fetch badge details for toast
      const { data: badges } = await supabase
        .from("achievements")
        .select("key, name, icon")
        .in("key", newBadges);

      badges?.forEach((b: any) => {
        toast.success(`${b.icon} Achievement Unlocked: ${b.name}!`, {
          duration: 5000,
        });
      });
    }
  }, [user]);

  return { checkAchievements };
}
