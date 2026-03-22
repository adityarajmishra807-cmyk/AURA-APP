import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  stake: number;
  mode: string;
  status: string;
  theme: string | null;
  target_score: number | null;
  start_time: string | null;
  end_time: string | null;
  winner_id: string | null;
  platform_fee: number;
  created_at: string;
  challenger_profile?: { username: string; avatar_url: string | null; aurix_balance: number };
  opponent_profile?: { username: string; avatar_url: string | null; aurix_balance: number };
}

export interface BattleScore {
  id: string;
  battle_id: string;
  user_id: string;
  avg_rating: number;
  unique_raters: number;
  engagement_score: number;
  final_score: number;
  posts_count: number;
}

export interface BattleStats {
  total_battles: number;
  wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  best_streak: number;
  total_earned: number;
  total_lost: number;
}

export function useBattles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [stats, setStats] = useState<BattleStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBattles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("battles")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Fetch profiles for all participants
      const userIds = new Set<string>();
      data.forEach((b: any) => { userIds.add(b.challenger_id); userIds.add(b.opponent_id); });
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, aurix_balance")
        .in("user_id", Array.from(userIds));

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      const enriched = data.map((b: any) => ({
        ...b,
        challenger_profile: profileMap[b.challenger_id],
        opponent_profile: profileMap[b.opponent_id],
      }));
      setBattles(enriched);
    }
    setLoading(false);
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("battle_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setStats(data as BattleStats | null);
  }, [user]);

  const createBattle = async (opponentId: string, stake: number, mode: string, theme?: string) => {
    const { data } = await supabase.rpc("create_battle", {
      p_opponent_id: opponentId,
      p_stake: stake,
      p_mode: mode,
      p_theme: theme || null,
    });
    if (data && (data as any).success) {
      await fetchBattles();
    }
    return data as any;
  };

  const acceptBattle = async (battleId: string) => {
    const { data } = await supabase.rpc("accept_battle", { p_battle_id: battleId });
    if (data && (data as any).success) {
      await fetchBattles();
    }
    return data as any;
  };

  const declineBattle = async (battleId: string) => {
    const { data } = await supabase.rpc("decline_battle", { p_battle_id: battleId });
    if (data && (data as any).success) {
      await fetchBattles();
    }
    return data as any;
  };

  const fetchScores = async (battleId: string): Promise<BattleScore[]> => {
    const { data } = await supabase
      .from("battle_scores")
      .select("*")
      .eq("battle_id", battleId);
    return (data as BattleScore[]) || [];
  };

  useEffect(() => {
    fetchBattles();
    fetchStats();

    if (!user) return;
    const channel = supabase
      .channel("battles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "battles" }, () => {
        fetchBattles();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_scores" }, () => {
        // scores updated
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBattles, fetchStats]);

  return {
    battles,
    stats,
    loading,
    createBattle,
    acceptBattle,
    declineBattle,
    fetchScores,
    refresh: fetchBattles,
    refreshStats: fetchStats,
  };
}
