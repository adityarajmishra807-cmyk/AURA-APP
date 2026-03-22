import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Swords, Trophy, Clock, ArrowLeft, Flame, TrendingUp, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Battle, BattleScore } from "@/hooks/useBattles";

interface BattleViewProps {
  battle: Battle;
  onBack: () => void;
}

export function BattleView({ battle, onBack }: BattleViewProps) {
  const { user } = useAuth();
  const [scores, setScores] = useState<BattleScore[]>([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [resolving, setResolving] = useState(false);

  const isChallenger = battle.challenger_id === user?.id;

  const fetchScores = useCallback(async () => {
    const { data } = await supabase
      .from("battle_scores")
      .select("*")
      .eq("battle_id", battle.id);
    if (data) setScores(data as BattleScore[]);
  }, [battle.id]);

  useEffect(() => {
    fetchScores();
    const channel = supabase
      .channel(`battle-${battle.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_scores", filter: `battle_id=eq.${battle.id}` }, () => {
        fetchScores();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [battle.id, fetchScores]);

  // Timer
  useEffect(() => {
    if (!battle.end_time || battle.status !== "active") return;
    const update = () => {
      const end = new Date(battle.end_time!).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [battle.end_time, battle.status]);

  const myScore = scores.find(s => s.user_id === user?.id);
  const opponentScore = scores.find(s => s.user_id !== user?.id);
  const maxScore = Math.max(myScore?.final_score || 1, opponentScore?.final_score || 1, 1);
  const myPercent = ((myScore?.final_score || 0) / maxScore) * 100;
  const opponentPercent = ((opponentScore?.final_score || 0) / maxScore) * 100;
  const isAhead = (myScore?.final_score || 0) > (opponentScore?.final_score || 0);

  const isExpired = battle.end_time && new Date(battle.end_time).getTime() < Date.now();
  const canResolve = battle.status === "active" && isExpired;

  const handleResolve = async () => {
    setResolving(true);
    const { data } = await supabase.rpc("resolve_battle", { p_battle_id: battle.id });
    setResolving(false);
    fetchScores();
  };

  const isWinner = battle.winner_id === user?.id;
  const isDraw = battle.status === "completed" && !battle.winner_id;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Swords className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          {battle.status === "completed" ? "Battle Results" : "Live Battle"}
        </h2>
      </div>

      {/* Timer */}
      {battle.status === "active" && (
        <motion.div
          className="text-center py-3 rounded-xl bg-card/80 border border-border/30"
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Clock className="w-4 h-4 text-aura-gold mx-auto mb-1" />
          <div className="text-2xl font-bold text-aura-gold font-mono">{timeLeft || "..."}</div>
          <div className="text-xs text-muted-foreground">remaining</div>
        </motion.div>
      )}

      {/* Result banner */}
      <AnimatePresence>
        {battle.status === "completed" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-center py-6 rounded-2xl border",
              isDraw
                ? "bg-muted/30 border-border/30"
                : isWinner
                  ? "bg-aura-gold/10 border-aura-gold/30 shadow-[0_0_40px_hsl(var(--aura-gold)/0.15)]"
                  : "bg-destructive/10 border-destructive/30"
            )}
          >
            <Trophy className={cn("w-10 h-10 mx-auto mb-2", isDraw ? "text-muted-foreground" : isWinner ? "text-aura-gold" : "text-destructive")} />
            <div className="text-2xl font-bold text-foreground">
              {isDraw ? "It's a Draw!" : isWinner ? "Victory!" : "Defeat"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isDraw
                ? `Each player gets ${Math.floor(battle.stake * 2 * 0.9 / 2)} AURIX`
                : isWinner
                  ? `You won ${Math.floor(battle.stake * 2 * 0.9)} AURIX!`
                  : `You lost ${battle.stake} AURIX`
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VS Score Display */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Player 1 (me) */}
        <div className="text-center space-y-2">
          <div className="text-sm font-bold text-foreground">You</div>
          <motion.div
            className="text-3xl font-black text-primary"
            key={myScore?.final_score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
          >
            {(myScore?.final_score || 0).toFixed(1)}
          </motion.div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Avg: {(myScore?.avg_rating || 0).toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> {myScore?.unique_raters || 0} raters
            </div>
            <div className="flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" /> {myScore?.posts_count || 0} posts
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-lg font-black text-primary/60">VS</div>
          <div className="text-xs text-aura-gold font-bold">{battle.stake * 2} ⚡</div>
        </div>

        {/* Player 2 (opponent) */}
        <div className="text-center space-y-2">
          <div className="text-sm font-bold text-foreground">
            @{isChallenger ? battle.opponent_profile?.username : battle.challenger_profile?.username}
          </div>
          <motion.div
            className="text-3xl font-black text-aura-rose"
            key={opponentScore?.final_score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
          >
            {(opponentScore?.final_score || 0).toFixed(1)}
          </motion.div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Avg: {(opponentScore?.avg_rating || 0).toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> {opponentScore?.unique_raters || 0} raters
            </div>
            <div className="flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" /> {opponentScore?.posts_count || 0} posts
            </div>
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-2 px-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Your score</span>
            <span>{(myScore?.final_score || 0).toFixed(1)}</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${myPercent}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Opponent score</span>
            <span>{(opponentScore?.final_score || 0).toFixed(1)}</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-aura-rose to-aura-rose/60"
              initial={{ width: 0 }}
              animate={{ width: `${opponentPercent}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Status prompt */}
      {battle.status === "active" && !isExpired && (
        <div className={cn(
          "text-center py-2 rounded-xl text-sm font-medium",
          isAhead ? "bg-aura-mint/10 text-aura-mint" : "bg-aura-rose/10 text-aura-rose"
        )}>
          {isAhead ? "🔥 You're in the lead!" : "⚡ Catch up! Post and get rated!"}
        </div>
      )}

      {/* Resolve button */}
      {canResolve && (
        <Button
          onClick={handleResolve}
          disabled={resolving}
          className="w-full bg-aura-gold/20 text-aura-gold border border-aura-gold/30 hover:bg-aura-gold/30 font-bold"
        >
          {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
          Resolve Battle
        </Button>
      )}

      {/* Scoring explanation */}
      <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-xs text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground/80 mb-1">How scoring works:</div>
        <div>• Avg Rating × 0.5 — quality of your posts</div>
        <div>• Unique Raters × 0.3 — reach & engagement</div>
        <div>• Engagement × 0.2 — likes & comments</div>
      </div>
    </div>
  );
}
