import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Swords, Zap, Target, Palette, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId?: string;
  targetUsername?: string;
  onCreated: () => void;
}

const STAKES = [10, 25, 50, 100];
const MODES = [
  { key: "classic", label: "Classic", icon: Swords, desc: "24 hours", color: "text-primary" },
  { key: "blitz", label: "Blitz", icon: Zap, desc: "1 hour", color: "text-aura-gold" },
  { key: "target", label: "Target", icon: Target, desc: "First to score", color: "text-aura-mint" },
  { key: "theme", label: "Theme", icon: Palette, desc: "Topic battle", color: "text-aura-rose" },
];

export function ChallengeDialog({ open, onOpenChange, targetUserId, targetUsername, onCreated }: ChallengeDialogProps) {
  const { user } = useAuth();
  const [stake, setStake] = useState(25);
  const [mode, setMode] = useState("classic");
  const [theme, setTheme] = useState("");
  const [searchQuery, setSearchQuery] = useState(targetUsername || "");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; username: string } | null>(
    targetUserId && targetUsername ? { id: targetUserId, username: targetUsername } : null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (targetUserId && targetUsername) {
      setSelectedOpponent({ id: targetUserId, username: targetUsername });
      setSearchQuery(targetUsername);
    }
  }, [targetUserId, targetUsername]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchQuery.length < 2 || selectedOpponent) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .ilike("username", `%${searchQuery}%`)
        .neq("user_id", user?.id || "")
        .limit(5);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user, selectedOpponent]);

  const handleSubmit = async () => {
    if (!selectedOpponent) {
      toast.error("Select an opponent");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_battle", {
      p_opponent_id: selectedOpponent.id,
      p_stake: stake,
      p_mode: mode,
      p_theme: mode === "theme" ? theme : null,
    });
    setSubmitting(false);

    if (error) {
      console.error("Battle RPC error:", error);
      toast.error(error.message || "Failed to create battle");
      return;
    }

    const result = data as any;
    if (result?.success) {
      toast.success(`⚔️ Challenge sent! ${stake} AURIX staked`);
      onCreated();
      onOpenChange(false);
    } else {
      toast.error(result?.error || "Failed to create battle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> Challenge to Battle
          </DialogTitle>
          <DialogDescription>Stake AURIX and compete for glory</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Opponent search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Opponent</label>
            {selectedOpponent ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <span className="font-medium text-foreground">@{selectedOpponent.username}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedOpponent(null); setSearchQuery(""); setSearchResults([]); }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search username..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                />
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-xl overflow-hidden z-10 shadow-xl"
                    >
                      {searchResults.map((r) => (
                        <button
                          key={r.user_id}
                          onClick={() => { setSelectedOpponent({ id: r.user_id, username: r.username }); setSearchQuery(r.username); setSearchResults([]); }}
                          className="w-full px-4 py-2.5 text-left hover:bg-secondary/50 text-sm text-foreground transition-colors"
                        >
                          @{r.username}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Stake selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Stake Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {STAKES.map((s) => (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStake(s)}
                  className={cn(
                    "relative py-3 rounded-xl font-bold text-sm transition-all",
                    stake === s
                      ? "bg-primary/20 border-2 border-primary text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                      : "bg-secondary/50 border border-border/30 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {s}
                  <span className="text-[10px] block font-normal opacity-70">AURIX</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Battle Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <motion.button
                  key={m.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "relative flex items-center gap-2 p-3 rounded-xl text-left text-sm transition-all",
                    mode === m.key
                      ? "bg-primary/15 border-2 border-primary/60"
                      : "bg-secondary/50 border border-border/30 hover:border-primary/30"
                  )}
                >
                  <m.icon className={cn("w-4 h-4", m.color)} />
                  <div>
                    <div className="font-semibold text-foreground">{m.label}</div>
                    <div className="text-[10px] text-muted-foreground">{m.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Theme input */}
          <AnimatePresence>
            {mode === "theme" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Battle theme (e.g., Gym, Coding, Memes)"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pool preview */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-aura-gold/10 border border-aura-gold/20">
            <span className="text-sm text-muted-foreground">Total Pool</span>
            <span className="font-bold text-aura-gold">{stake * 2} AURIX</span>
          </div>
          <div className="flex items-center justify-between px-3 text-xs text-muted-foreground">
            <span>Winner gets: {Math.floor(stake * 2 * 0.9)} AURIX</span>
            <span>Platform fee: {Math.ceil(stake * 2 * 0.1)} AURIX</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedOpponent}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Swords className="w-4 h-4 mr-2" />}
            Send Challenge — {stake} AURIX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
