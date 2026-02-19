import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function getAuraTier(balance: number) {
  if (balance >= 5000) return { ring: "ring-2 ring-aura-gold/50", glow: "shadow-[0_0_10px_hsl(var(--aura-gold)/0.4)]" };
  if (balance >= 2000) return { ring: "ring-2 ring-accent/40", glow: "shadow-[0_0_8px_hsl(var(--accent)/0.3)]" };
  if (balance >= 500) return { ring: "ring-1 ring-primary/30", glow: "shadow-[0_0_6px_hsl(var(--primary)/0.2)]" };
  return { ring: "", glow: "" };
}

function getRank(balance: number) {
  if (balance >= 5000) return "Elite";
  if (balance >= 2000) return "Influencer";
  if (balance >= 500) return "Rising";
  return "Newcomer";
}

interface Props {
  otherUser: any;
  energy: "calm" | "active" | "intense";
  onBack: () => void;
}

export function ChatHeader({ otherUser, energy, onBack }: Props) {
  const [showPopover, setShowPopover] = useState(false);
  const navigate = useNavigate();
  const tier = getAuraTier(otherUser?.aurix_balance || 0);
  const isOnline = (otherUser?.streak_count || 0) > 0;

  const energyColors = {
    calm: "bg-aura-mint/60",
    active: "bg-primary/60",
    intense: "bg-accent/60",
  };

  return (
    <div className="relative z-10">
      <div className="flex items-center gap-3 px-4 py-3 bg-card/40 backdrop-blur-xl border-b border-border/20">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors tap-target md:hidden">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="relative">
            <div className={cn("rounded-full", tier.ring, tier.glow)}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherUser?.avatar_url || ""} />
                <AvatarFallback className="bg-muted font-display font-bold text-sm">
                  {otherUser?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className={cn(
              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card",
              isOnline ? "bg-aura-mint shadow-[0_0_4px_hsl(var(--aura-mint)/0.6)]" : "bg-muted-foreground/30"
            )} />
          </div>

          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{otherUser?.username || "..."}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {otherUser?.college_name || ""}{otherUser?.college_name ? " • " : ""}{getRank(otherUser?.aurix_balance || 0)}
            </p>
          </div>
        </button>
      </div>

      {/* Animated energy line */}
      <motion.div
        className={cn("h-0.5 w-full", energyColors[energy])}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: energy === "intense" ? 1 : energy === "active" ? 2 : 4, repeat: Infinity }}
      />

      {/* Profile popover */}
      <AnimatePresence>
        {showPopover && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPopover(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-full left-4 right-4 md:left-16 md:right-auto md:w-64 z-50 mt-2 p-4 rounded-xl glass-card border border-border/40"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("rounded-full", tier.ring, tier.glow)}>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={otherUser?.avatar_url || ""} />
                    <AvatarFallback className="bg-muted font-display font-bold">
                      {otherUser?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <p className="font-medium text-foreground">{otherUser?.username}</p>
                  <p className="text-xs text-muted-foreground">{otherUser?.college_name || "No college"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/40 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Rank</p>
                  <p className="font-medium text-foreground">{getRank(otherUser?.aurix_balance || 0)}</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">AURIX</p>
                  <p className="font-medium text-gradient-aurix">{otherUser?.aurix_balance || 0}</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2 text-center col-span-2">
                  <p className="text-muted-foreground">Momentum</p>
                  <div className="flex items-center justify-center gap-1">
                    {(otherUser?.streak_count || 0) > 3 ? (
                      <TrendingUp className="w-3 h-3 text-aura-mint" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{otherUser?.streak_count || 0} day streak</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { navigate(`/profile/${otherUser?.username}`); setShowPopover(false); }}
                className="w-full mt-3 text-xs text-primary hover:underline"
              >
                View full profile →
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
