import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useBattles } from "@/hooks/useBattles";
import { BattleCard } from "@/components/battles/BattleCard";
import { BattleView } from "@/components/battles/BattleView";
import { ChallengeDialog } from "@/components/battles/ChallengeDialog";
import { Button } from "@/components/ui/button";
import { Swords, Plus, Trophy, Flame, Target, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Battle } from "@/hooks/useBattles";

type Tab = "active" | "pending" | "history";

export default function Battles() {
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
      <DashboardLayout>
        <BattleView
          battle={selectedBattle}
          onBack={() => { setSelectedBattle(null); refresh(); refreshStats(); }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black text-foreground">Battles</h1>
          </div>
          <Button
            onClick={() => setChallengeOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Challenge
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
              className="p-3 rounded-xl bg-card/60 border border-border/30 text-center"
            >
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Title */}
        {stats && stats.total_battles > 0 && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Shield className="w-4 h-4 text-aura-gold" />
            <span className="text-sm font-bold text-aura-gold">{getTitle()}</span>
          </div>
        )}

        {/* Earned/Lost */}
        {stats && (
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-xl bg-aura-mint/10 border border-aura-mint/20 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-aura-mint mx-auto mb-1" />
              <div className="text-sm font-bold text-aura-mint">+{stats.total_earned}</div>
              <div className="text-[10px] text-muted-foreground">Earned</div>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-destructive mx-auto mb-1 rotate-180" />
              <div className="text-sm font-bold text-destructive">-{stats.total_lost}</div>
              <div className="text-[10px] text-muted-foreground">Lost</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5">
          {([
            { key: "active" as Tab, label: "Active" },
            { key: "pending" as Tab, label: "Pending" },
            { key: "history" as Tab, label: "History" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {tab === t.key && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
                  layoutId="battleTab"
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
              className="text-center py-12"
            >
              <Swords className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {tab === "active" ? "No active battles" : tab === "pending" ? "No pending challenges" : "No battle history"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
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
      </div>

      <ChallengeDialog
        open={challengeOpen}
        onOpenChange={setChallengeOpen}
        onCreated={() => { refresh(); refreshStats(); }}
      />
    </DashboardLayout>
  );
}
