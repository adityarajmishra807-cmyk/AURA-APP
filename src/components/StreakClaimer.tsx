import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, Coins, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StreakClaimer() {
  const { user, refreshProfile } = useAuth();
  const [show, setShow] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ streak: number; bonus: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    // Check if streak already claimed today
    supabase.rpc("claim_daily_streak").then(({ data }) => {
      const res = data as any;
      if (res?.success) {
        setResult({ streak: res.streak, bonus: res.bonus });
        setShow(true);
        refreshProfile();
      }
      // If already_claimed, don't show
    });
  }, [user]);

  if (!show || !result) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShow(false)}
      >
        <motion.div
          className="glass-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center glow"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
          >
            <Flame className="w-16 h-16 text-accent mx-auto mb-4" />
          </motion.div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-1">
            Day {result.streak} Streak! 🔥
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Keep coming back to earn more AURIX
          </p>

          <motion.div
            className="flex items-center justify-center gap-2 text-2xl font-display font-bold text-gradient-aurix aurix-glow mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Coins className="w-6 h-6 text-aura-gold" />
            +{result.bonus} AURIX
          </motion.div>

          {result.streak === 6 && (
            <p className="text-xs text-aura-mint mb-4">🎯 1 more day for 7-day streak bonus (+25 AURIX)!</p>
          )}
          {result.streak === 29 && (
            <p className="text-xs text-aura-mint mb-4">🎯 1 more day for 30-day streak bonus (+100 AURIX)!</p>
          )}

          <Button
            onClick={() => setShow(false)}
            className="gradient-primary text-primary-foreground glow-sm"
          >
            Awesome!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
