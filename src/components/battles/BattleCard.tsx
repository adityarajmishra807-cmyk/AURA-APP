import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Swords, Clock, Trophy, Zap, Target, Palette, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Battle } from "@/hooks/useBattles";

interface BattleCardProps {
  battle: Battle;
  onAccept: (id: string) => Promise<any>;
  onDecline: (id: string) => Promise<any>;
  onClick: (battle: Battle) => void;
}

const modeIcons: Record<string, any> = {
  classic: Swords,
  blitz: Zap,
  target: Target,
  theme: Palette,
};

const modeColors: Record<string, string> = {
  classic: "text-primary",
  blitz: "text-aura-gold",
  target: "text-aura-mint",
  theme: "text-aura-rose",
};

const statusColors: Record<string, string> = {
  pending: "bg-aura-gold/15 text-aura-gold border-aura-gold/30",
  active: "bg-aura-mint/15 text-aura-mint border-aura-mint/30",
  completed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
};

export function BattleCard({ battle, onAccept, onDecline, onClick }: BattleCardProps) {
  const { user } = useAuth();
  const [acting, setActing] = useState<string | null>(null);

  const isChallenger = battle.challenger_id === user?.id;
  const opponent = isChallenger ? battle.opponent_profile : battle.challenger_profile;
  const myProfile = isChallenger ? battle.challenger_profile : battle.opponent_profile;
  const ModeIcon = modeIcons[battle.mode] || Swords;
  const isPending = battle.status === "pending";
  const canRespond = isPending && !isChallenger;
  const isWinner = battle.winner_id === user?.id;
  const isActive = battle.status === "active";

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActing("accept");
    await onAccept(battle.id);
    setActing(null);
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActing("decline");
    await onDecline(battle.id);
    setActing(null);
  };

  const timeLeft = battle.end_time
    ? formatDistanceToNow(new Date(battle.end_time), { addSuffix: false })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(battle)}
      className={cn(
        "relative p-4 rounded-2xl border cursor-pointer transition-all hover:border-primary/30",
        isActive
          ? "bg-card/80 border-aura-mint/30 shadow-[0_0_30px_hsl(var(--aura-mint)/0.08)]"
          : "bg-card/60 border-border/30"
      )}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ModeIcon className={cn("w-4 h-4", modeColors[battle.mode])} />
          <span className="text-xs font-semibold text-foreground capitalize">{battle.mode}</span>
          {battle.theme && <span className="text-xs text-muted-foreground">• {battle.theme}</span>}
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase", statusColors[battle.status])}>
          {battle.status}
        </span>
      </div>

      {/* VS layout */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-foreground truncate">
            {isChallenger ? "You" : `@${battle.challenger_profile?.username || "?"}`}
          </div>
        </div>
        <div className="flex flex-col items-center mx-3">
          <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
            {battle.stake} ⚡
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">VS</span>
        </div>
        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-foreground truncate">
            {!isChallenger ? "You" : `@${battle.opponent_profile?.username || "?"}`}
          </div>
        </div>
      </div>

      {/* Timer or result */}
      <div className="mt-3 flex items-center justify-between">
        {isActive && timeLeft && (
          <div className="flex items-center gap-1 text-xs text-aura-gold">
            <Clock className="w-3 h-3" />
            {timeLeft} left
          </div>
        )}
        {battle.status === "completed" && (
          <div className="flex items-center gap-1 text-xs">
            <Trophy className={cn("w-3 h-3", isWinner ? "text-aura-gold" : "text-muted-foreground")} />
            <span className={isWinner ? "text-aura-gold font-bold" : "text-muted-foreground"}>
              {battle.winner_id ? (isWinner ? `Won ${Math.floor(battle.stake * 2 * 0.9)} AURIX` : `Lost ${battle.stake} AURIX`) : "Draw"}
            </span>
          </div>
        )}
        {isPending && isChallenger && (
          <span className="text-xs text-muted-foreground">Waiting for response...</span>
        )}
        <span className="text-[10px] text-muted-foreground">
          Pool: {battle.stake * 2} AURIX
        </span>
      </div>

      {/* Accept/Decline buttons */}
      {canRespond && (
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleAccept}
            disabled={acting !== null}
            size="sm"
            className="flex-1 bg-aura-mint/20 text-aura-mint border border-aura-mint/30 hover:bg-aura-mint/30"
          >
            {acting === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
            Accept
          </Button>
          <Button
            onClick={handleDecline}
            disabled={acting !== null}
            size="sm"
            variant="ghost"
            className="flex-1 text-destructive hover:bg-destructive/10"
          >
            {acting === "decline" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
            Decline
          </Button>
        </div>
      )}
    </motion.div>
  );
}
