import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBattles } from "@/hooks/useBattles";
import { BattleCard } from "./BattleCard";
import { BattleView } from "./BattleView";
import { ChallengeDialog } from "./ChallengeDialog";
import { Button } from "@/components/ui/button";
import { Swords, Plus, Trophy, Flame, Target, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Battle } from "@/hooks/useBattles";

type Tab = "active" | "pending" | "history";

export function BattlesPanel() {
  const { battles, stats, loading, acceptBattle, declineBattle, refresh, refreshStats } = useBattles();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
  const [tab, setTab] = useState<Tab>("active");

  const handleAccept = async (id: string) => {
    const result = await acceptBattle(id);
    if (result?.success) {
      toast.success("⚔️ Battle accepted! Game on!");
      refreshStats();
    } else {
      toast.error(result?.error || "Failed to accept");
    }
    return result;
  };

  const handleDecline = async (id: string) => {
    const result = await declineBattle(id);
    if (result?.success) {
      toast.success("Battle declined");
    } else {
      toast.error(result?.error || "Failed to decline");
    }
    return result;
  };

  const filteredBattles = battles.filter(b => {
    if (tab === "active") return b.status === "active";
    if (tab === "pending") return b.status === "pending";
    return b.status === "completed" || b.status === "cancelled";
  });

  const winRate = stats && stats.total_battles > 0
    ? Math.round((stats.wins / stats.total_battles) * 100)
    : 0;

  const getTitle = () => {
    if (!stats) return "Rising Challenger";
    if (stats.wins >= 50) return "Undefeated 🔥";
    if (stats.wins >= 20) return "Duel Master";
    if (stats.wins >= 5) return "Battle Veteran";
    return "Rising Challenger";
  };

  if (selectedBattle) {
    return (
      <BattleView
        battle={selectedBattle}
        onBack={() => { setSelectedBattle(null); refresh(); refreshStats(); }}
      />
    );
  }

  return (
    <div className="space-y-4 h-full overflow-y-auto pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Battles</h2>
        </div>
        <Button
          onClick={() => setChallengeOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Challenge
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Battles", value: stats?.total_battles || 0, icon: Swords, color: "text-primary" },
          { label: "Wins", value: stats?.wins || 0, icon: Trophy, color: "text-aura-gold" },
          { label: "Streak", value: stats?.win_streak || 0, icon: Flame, color: "text-aura-rose" },
          { label: "Win %", value: `${winRate}%`, icon: Target, color: "text-aura-mint" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-card/60 border border-border/30 text-center"
          >
            <s.icon className={cn("w-3.5 h-3.5 mx-auto mb-1", s.color)} />
            <div className="text-sm font-bold text-foreground">{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Title */}
      {stats && stats.total_battles > 0 && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Shield className="w-3.5 h-3.5 text-aura-gold" />
          <span className="text-xs font-bold text-aura-gold">{getTitle()}</span>
        </div>
      )}

      {/* Earned/Lost */}
      {stats && (
        <div className="flex gap-2">
          <div className="flex-1 p-2.5 rounded-xl bg-aura-mint/10 border border-aura-mint/20 text-center">
            <TrendingUp className="w-3 h-3 text-aura-mint mx-auto mb-0.5" />
            <div className="text-xs font-bold text-aura-mint">+{stats.total_earned}</div>
            <div className="text-[9px] text-muted-foreground">Earned</div>
          </div>
          <div className="flex-1 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <TrendingUp className="w-3 h-3 text-destructive mx-auto mb-0.5 rotate-180" />
            <div className="text-xs font-bold text-destructive">-{stats.total_lost}</div>
            <div className="text-[9px] text-muted-foreground">Lost</div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1.5">
        {([
          { key: "active" as Tab, label: "Active" },
          { key: "pending" as Tab, label: "Pending" },
          { key: "history" as Tab, label: "History" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {tab === t.key && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
                layoutId="battleSubTab"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={cn("relative z-10", tab === t.key ? "text-primary" : "text-muted-foreground")}>
              {t.label}
              {t.key === "pending" && battles.filter(b => b.status === "pending").length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[9px] bg-primary text-primary-foreground rounded-full">
                  {battles.filter(b => b.status === "pending").length}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Battle list */}
      <AnimatePresence mode="popLayout">
        {filteredBattles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {tab === "active" ? "No active battles" : tab === "pending" ? "No pending challenges" : "No battle history"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {filteredBattles.map((b) => (
              <BattleCard
                key={b.id}
                battle={b}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onClick={setSelectedBattle}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <ChallengeDialog
        open={challengeOpen}
        onOpenChange={setChallengeOpen}
        onCreated={() => { refresh(); refreshStats(); }}
      />
    </div>
  );
}
