import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, TrendingUp, TrendingDown, Phone, Video,
  MoreVertical, UserX, AlertTriangle, X, ShieldBan, Swords
} from "lucide-react";
import { ChallengeDialog } from "@/components/battles/ChallengeDialog";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CallModal } from "./CallModal";

function getAuraTier(balance: number) {
  if (balance >= 5000) return { ring: "ring-2 ring-aura-gold/50", glow: "shadow-[0_0_12px_hsl(var(--aura-gold)/0.35)]" };
  if (balance >= 2000) return { ring: "ring-2 ring-accent/40", glow: "shadow-[0_0_10px_hsl(var(--accent)/0.25)]" };
  if (balance >= 500) return { ring: "ring-1 ring-primary/30", glow: "shadow-[0_0_8px_hsl(var(--primary)/0.2)]" };
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
  const [challengeOpen, setChallengeOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const tier = getAuraTier(otherUser?.aurix_balance || 0);
  const isOnline = (otherUser?.streak_count || 0) > 0;

  const energyConfig = {
    calm: { gradient: "from-primary/15 via-primary/5 to-transparent", speed: 4 },
    active: { gradient: "from-primary/40 via-accent/15 to-transparent", speed: 2 },
    intense: { gradient: "from-accent/50 via-primary/25 to-transparent", speed: 1 },
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
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card/40 backdrop-blur-xl border-b border-border/15">
          {/* Back button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors md:hidden shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>

          {/* Avatar + info */}
          <button
            onClick={() => { setShowPopover(!showPopover); setShowMenu(false); }}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div className="relative shrink-0">
              <div className={cn("rounded-full transition-shadow duration-500", tier.ring, tier.glow)}>
                <Avatar className="w-9 h-9">
                  <AvatarImage src={otherUser?.avatar_url || ""} />
                  <AvatarFallback className="bg-muted font-display font-bold text-sm">
                    {otherUser?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <motion.div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                  isOnline
                    ? "bg-aura-mint"
                    : "bg-muted-foreground/30"
                )}
                animate={isOnline ? { boxShadow: ["0 0 0px hsl(var(--aura-mint)/0)", "0 0 8px hsl(var(--aura-mint)/0.6)", "0 0 0px hsl(var(--aura-mint)/0)"] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {otherUser?.username || "..."}
                </p>
                {isBlocked && (
                  <span className="text-[9px] px-1.5 py-px rounded-full bg-destructive/15 text-destructive font-semibold">
                    Blocked
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {isOnline ? (
                  <span className="text-aura-mint">● Active</span>
                ) : (
                  <span>○ Offline</span>
                )} · {getRank(otherUser?.aurix_balance || 0)}
              </p>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { setChallengeOpen(true); setShowMenu(false); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all text-foreground/70 hover:text-primary"
              title="Challenge to battle"
            >
              <Swords className="w-[18px] h-[18px]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => handleCall("voice")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all text-foreground/70 hover:text-primary"
              title="Voice call"
            >
              <Phone className="w-[18px] h-[18px]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => handleCall("video")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-all text-foreground/70 hover:text-primary"
              title="Video call"
            >
              <Video className="w-[18px] h-[18px]" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { setShowMenu(!showMenu); setShowPopover(false); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-secondary/50 transition-all"
            >
              <MoreVertical className="w-[18px] h-[18px] text-foreground/70" />
            </motion.button>
          </div>
        </div>

        {/* Energy gradient line - animated pulse */}
        <div className="relative h-[2px] w-full overflow-hidden">
          <motion.div
            className={cn("absolute inset-0 bg-gradient-to-r", energyConfig[energy].gradient)}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: energyConfig[energy].speed, repeat: Infinity, ease: "easeInOut" }}
          />
          {energy === "intense" && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "30%" }}
            />
          )}
        </div>

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
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="absolute top-full right-3 mt-1.5 w-48 z-50 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-2xl shadow-black/30 overflow-hidden"
            >
              <button
                onClick={() => { navigate(`/profile/${otherUser?.username}`); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary/40 transition-colors"
              >
                View profile
              </button>
              <div className="h-px bg-border/20 mx-3" />
              <button
                onClick={() => { handleCall("voice"); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary/40 transition-colors"
              >
                <Phone className="w-4 h-4" /> Voice call
              </button>
              <button
                onClick={() => { handleCall("video"); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-secondary/40 transition-colors"
              >
                <Video className="w-4 h-4" /> Video call
              </button>
              <button
                onClick={() => { setChallengeOpen(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                <Swords className="w-4 h-4" /> ⚔️ Challenge to battle
              </button>
              <div className="h-px bg-border/20 mx-3" />
              {isBlocked ? (
                <button
                  onClick={handleUnblock}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <ShieldBan className="w-4 h-4" /> Unblock user
                </button>
              ) : (
                <button
                  onClick={() => { setShowBlockConfirm(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
              initial={{ opacity: 0, y: -10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="absolute top-full left-3 right-3 md:left-16 md:right-auto md:w-72 z-50 mt-2 p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/30 shadow-2xl shadow-black/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("rounded-full", tier.ring, tier.glow)}>
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={otherUser?.avatar_url || ""} />
                    <AvatarFallback className="bg-muted font-display font-bold text-lg">
                      {otherUser?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{otherUser?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{otherUser?.college_name || "No college"}</p>
                </div>
                <button onClick={() => setShowPopover(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/10">
                  <p className="text-muted-foreground text-[10px] mb-1 font-medium">Rank</p>
                  <p className="font-bold text-foreground">{getRank(otherUser?.aurix_balance || 0)}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/10">
                  <p className="text-muted-foreground text-[10px] mb-1 font-medium">AURIX</p>
                  <p className="font-bold text-primary">{(otherUser?.aurix_balance || 0).toLocaleString()}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 text-center border border-border/10">
                  <p className="text-muted-foreground text-[10px] mb-1 font-medium">Streak</p>
                  <div className="flex items-center justify-center gap-0.5">
                    {(otherUser?.streak_count || 0) > 3 ? (
                      <TrendingUp className="w-3 h-3 text-aura-mint" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="font-bold">{otherUser?.streak_count || 0}d</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { navigate(`/profile/${otherUser?.username}`); setShowPopover(false); }}
                className="w-full text-xs text-center py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-semibold"
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
              <div className="w-full max-w-xs rounded-2xl bg-card border border-border/30 shadow-2xl p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">Block @{otherUser?.username}?</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      They won't be able to see your profile or message you. You can unblock them anytime.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={() => setShowBlockConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border/30 text-sm text-foreground hover:bg-secondary/40 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBlock}
                      className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors"
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
