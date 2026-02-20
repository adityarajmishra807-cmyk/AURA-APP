import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, TrendingUp, TrendingDown, Phone, Video,
  MoreVertical, UserX, AlertTriangle, X, ShieldBan
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CallModal } from "./CallModal";

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
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const tier = getAuraTier(otherUser?.aurix_balance || 0);
  const isOnline = (otherUser?.streak_count || 0) > 0;

  const energyColors = {
    calm: "from-primary/20 via-transparent",
    active: "from-primary/50 via-primary/20",
    intense: "from-accent/60 via-primary/30",
  };

  const handleCall = (type: "voice" | "video") => {
    setCallType(type);
    setCallOpen(true);
    setShowMenu(false);
  };

  const handleBlock = async () => {
    if (!user || !otherUser) return;
    try {
      await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: otherUser.user_id,
      });
      setIsBlocked(true);
      setShowBlockConfirm(false);
      setShowMenu(false);
      toast.success(`@${otherUser.username} has been blocked`);
    } catch {
      toast.error("Failed to block user");
    }
  };

  const handleUnblock = async () => {
    if (!user || !otherUser) return;
    await supabase.from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUser.user_id);
    setIsBlocked(false);
    setShowMenu(false);
    toast.success(`@${otherUser.username} has been unblocked`);
  };

  return (
    <>
      <div className="relative z-10">
        {/* Main header bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card/50 backdrop-blur-xl border-b border-border/20">
          {/* Back button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors md:hidden shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>

          {/* Avatar + info */}
          <button
            onClick={() => { setShowPopover(!showPopover); setShowMenu(false); }}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div className="relative shrink-0">
              <div className={cn("rounded-full", tier.ring, tier.glow)}>
                <Avatar className="w-9 h-9">
                  <AvatarImage src={otherUser?.avatar_url || ""} />
                  <AvatarFallback className="bg-muted font-display font-bold text-sm">
                    {otherUser?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                isOnline
                  ? "bg-aura-mint shadow-[0_0_5px_hsl(var(--aura-mint)/0.6)]"
                  : "bg-muted-foreground/30"
              )} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {otherUser?.username || "..."}
                </p>
                {isBlocked && (
                  <span className="text-[9px] px-1 py-px rounded bg-destructive/20 text-destructive font-medium">
                    Blocked
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">
                {isOnline ? "● Active" : "○ Offline"} · {getRank(otherUser?.aurix_balance || 0)}
              </p>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Voice call */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleCall("voice")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
              title="Voice call"
            >
              <Phone className="w-4 h-4 text-foreground" />
            </motion.button>

            {/* Video call */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleCall("video")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
              title="Video call"
            >
              <Video className="w-4 h-4 text-foreground" />
            </motion.button>

            {/* More menu */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowMenu(!showMenu); setShowPopover(false); }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>
        </div>

        {/* Energy gradient line */}
        <motion.div
          className={cn("h-0.5 w-full bg-gradient-to-r to-transparent", energyColors[energy])}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: energy === "intense" ? 1 : energy === "active" ? 2 : 4, repeat: Infinity }}
        />

        {/* Backdrop for menus */}
        <AnimatePresence>
          {(showMenu || showPopover) && (
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowMenu(false); setShowPopover(false); }}
            />
          )}
        </AnimatePresence>

        {/* ⋮ Dropdown menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="absolute top-full right-3 mt-1 w-48 z-50 rounded-xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-xl overflow-hidden"
            >
              <button
                onClick={() => { navigate(`/profile/${otherUser?.username}`); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary/40 transition-colors"
              >
                View profile
              </button>
              <div className="h-px bg-border/30 mx-2" />
              <button
                onClick={() => { handleCall("voice"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary/40 transition-colors"
              >
                <Phone className="w-4 h-4" /> Voice call
              </button>
              <button
                onClick={() => { handleCall("video"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary/40 transition-colors"
              >
                <Video className="w-4 h-4" /> Video call
              </button>
              <div className="h-px bg-border/30 mx-2" />
              {isBlocked ? (
                <button
                  onClick={handleUnblock}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <ShieldBan className="w-4 h-4" /> Unblock user
                </button>
              ) : (
                <button
                  onClick={() => { setShowBlockConfirm(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserX className="w-4 h-4" /> Block user
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile popover */}
        <AnimatePresence>
          {showPopover && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-full left-3 right-3 md:left-16 md:right-auto md:w-64 z-50 mt-1.5 p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-xl"
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{otherUser?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{otherUser?.college_name || "No college"}</p>
                </div>
                <button onClick={() => setShowPopover(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs mb-3">
                <div className="bg-secondary/40 rounded-xl p-2.5 text-center">
                  <p className="text-muted-foreground text-[10px] mb-0.5">Rank</p>
                  <p className="font-semibold text-foreground">{getRank(otherUser?.aurix_balance || 0)}</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-2.5 text-center">
                  <p className="text-muted-foreground text-[10px] mb-0.5">AURIX</p>
                  <p className="font-semibold text-primary">{(otherUser?.aurix_balance || 0).toLocaleString()}</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-2.5 text-center">
                  <p className="text-muted-foreground text-[10px] mb-0.5">Streak</p>
                  <div className="flex items-center justify-center gap-0.5">
                    {(otherUser?.streak_count || 0) > 3 ? (
                      <TrendingUp className="w-3 h-3 text-aura-mint" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{otherUser?.streak_count || 0}d</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { navigate(`/profile/${otherUser?.username}`); setShowPopover(false); }}
                className="w-full text-xs text-center py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
              >
                View full profile →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Block confirmation dialog */}
      <AnimatePresence>
        {showBlockConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-background/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[91] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xs rounded-2xl bg-card border border-border/40 shadow-2xl p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Block @{otherUser?.username}?</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      They won't be able to see your profile or message you. You can unblock them anytime.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      onClick={() => setShowBlockConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm text-foreground hover:bg-secondary/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBlock}
                      className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
                    >
                      Block
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Call modal */}
      <CallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        callType={callType}
        otherUser={otherUser}
      />
    </>
  );
}
