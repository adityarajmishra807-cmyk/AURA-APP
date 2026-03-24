
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Coins, Sparkles, Zap, Eye, Gift, Timer, X } from "lucide-react";
import { toast } from "sonner";

// Wheel segments
const SEGMENTS = [
  { label: "+10", type: "aurix_10", color: "hsl(265 80% 60%)", icon: Coins, amount: 10, rarity: "common" },
  { label: "2x Boost", type: "2x_boost", color: "hsl(330 70% 55%)", icon: Zap, amount: 0, rarity: "rare" },
  { label: "+25", type: "aurix_25", color: "hsl(200 80% 55%)", icon: Coins, amount: 25, rarity: "common" },
  { label: "+50", type: "aurix_50", color: "hsl(160 60% 50%)", icon: Coins, amount: 50, rarity: "uncommon" },
  { label: "Visibility", type: "visibility_boost", color: "hsl(42 90% 55%)", icon: Eye, amount: 0, rarity: "rare" },
  { label: "+100", type: "aurix_100", color: "hsl(265 90% 72%)", icon: Sparkles, amount: 100, rarity: "rare" },
  { label: "Mystery", type: "mystery", color: "hsl(280 80% 65%)", icon: Gift, amount: 0, rarity: "ultra rare" },
  { label: "+25", type: "aurix_25b", color: "hsl(200 80% 55%)", icon: Coins, amount: 25, rarity: "common" },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function getRewardLabel(type: string, amount: number) {
  if (type === "2x_boost") return "2x Rating Boost ⚡";
  if (type === "visibility_boost") return "Visibility Boost 👁️";
  if (type === "mystery") return `Mystery: +${amount} AURIX ✨`;
  return `+${amount} AURIX`;
}

function formatTime(ms: number) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailySpin() {
  const { profile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<{ type: string; amount: number; streakBonus: number } | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [canSpin, setCanSpin] = useState(true);
  const wheelControls = useAnimationControls();
  const hasChecked = useRef(false);

  // Check cooldown on mount
  useEffect(() => {
    if (!profile || hasChecked.current) return;
    hasChecked.current = true;

    supabase
      .from("daily_spins")
      .select("spun_at")
      .eq("user_id", profile.user_id)
      .order("spun_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const lastSpin = new Date(data[0].spun_at);
          const nextSpin = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
          if (nextSpin > new Date()) {
            setCooldownEnd(nextSpin);
            setCanSpin(false);
          }
        }
      });
  }, [profile]);

  // Countdown timer
  useEffect(() => {
    if (!cooldownEnd) return;
    const tick = () => {
      const diff = cooldownEnd.getTime() - Date.now();
      if (diff <= 0) {
        setCanSpin(true);
        setCooldownEnd(null);
        setTimeLeft("");
      } else {
        setTimeLeft(formatTime(diff));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const handleSpin = useCallback(async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);

    const { data } = await supabase.rpc("spin_daily_wheel");
    const res = data as any;

    if (!res?.success) {
      if (res?.error === "cooldown" && res?.next_spin_at) {
        setCooldownEnd(new Date(res.next_spin_at));
        setCanSpin(false);
      } else {
        toast.error(res?.error || "Spin failed");
      }
      setSpinning(false);
      return;
    }

    // Determine landing segment
    const segIndex = SEGMENTS.findIndex(
      (s) => s.type === res.reward_type || s.type.startsWith(res.reward_type.replace(/b$/, ""))
    );
    const targetIndex = segIndex >= 0 ? segIndex : 0;

    // Calculate final rotation: 5 full spins + offset to land on segment
    const segCenter = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const fullSpins = 5 * 360;
    const targetRotation = rotation + fullSpins + (360 - segCenter);

    setRotation(targetRotation);

    await wheelControls.start({
      rotate: targetRotation,
      transition: {
        duration: 4,
        ease: [0.2, 0.8, 0.3, 1],
      },
    });

    setReward({ type: res.reward_type, amount: res.reward_amount, streakBonus: res.streak_bonus });
    setShowReward(true);
    setSpinning(false);
    setCanSpin(false);
    setCooldownEnd(new Date(Date.now() + 24 * 60 * 60 * 1000));
    refreshProfile();
  }, [spinning, canSpin, rotation, wheelControls, refreshProfile]);

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-start px-4 py-6 overflow-hidden">
        {/* Background particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div
          className="text-center mb-6 relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            Daily Spin 🎯
          </h1>
          <p className="text-muted-foreground text-sm">
            Spin to earn AURIX & boosts
          </p>
          {profile && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-xs text-accent font-medium">
                🔥 {profile.streak_count} Day Streak
              </span>
            </div>
          )}
        </motion.div>

        {/* Wheel */}
        <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] mb-6 z-10">
          {/* Outer glow ring */}
          <div className="absolute inset-[-8px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg, hsl(265 80% 65% / 0.4), hsl(330 70% 60% / 0.4), hsl(200 80% 65% / 0.4), hsl(265 80% 65% / 0.4))",
              filter: "blur(12px)",
            }}
          />

          {/* Pointer / indicator at top */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
            <motion.div
              animate={spinning ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }}
            >
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_10px_hsl(265_80%_65%/0.8)]" />
            </motion.div>
          </div>

          {/* Wheel SVG */}
          <motion.div
            className="w-full h-full rounded-full overflow-hidden border-2 border-border/50 relative"
            style={{ boxShadow: "0 0 40px -10px hsl(265 80% 65% / 0.5), inset 0 0 20px hsl(0 0% 0% / 0.3)" }}
            animate={wheelControls}
            initial={{ rotate: 0 }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {SEGMENTS.map((seg, i) => {
                const startAngle = i * SEGMENT_ANGLE - 90;
                const endAngle = startAngle + SEGMENT_ANGLE;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 150 + 150 * Math.cos(startRad);
                const y1 = 150 + 150 * Math.sin(startRad);
                const x2 = 150 + 150 * Math.cos(endRad);
                const y2 = 150 + 150 * Math.sin(endRad);
                const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

                const midAngle = startAngle + SEGMENT_ANGLE / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textX = 150 + 90 * Math.cos(midRad);
                const textY = 150 + 90 * Math.sin(midRad);

                return (
                  <g key={i}>
                    <path
                      d={`M 150 150 L ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="hsl(240 15% 8%)"
                      strokeWidth="2"
                      opacity="0.85"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="13"
                      fontWeight="bold"
                      transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="150" cy="150" r="28" fill="hsl(240 15% 10%)" stroke="hsl(265 80% 65%)" strokeWidth="2" />
              <text x="150" y="150" textAnchor="middle" dominantBaseline="middle" fill="hsl(42 90% 60%)" fontSize="10" fontWeight="bold">
                AURIX
              </text>
            </svg>
          </motion.div>

          {/* Reflection */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full opacity-20"
            style={{
              background: "radial-gradient(ellipse, hsl(265 80% 65% / 0.3), transparent 70%)",
              filter: "blur(8px)",
            }}
          />
        </div>

        {/* Spin Button */}
        <motion.div className="relative z-10 mb-4" whileTap={canSpin && !spinning ? { scale: 0.95 } : {}}>
          <Button
            onClick={handleSpin}
            disabled={!canSpin || spinning}
            className="relative h-14 px-10 text-lg font-display font-bold rounded-2xl border-0 overflow-hidden disabled:opacity-40"
            style={{
              background: canSpin
                ? "linear-gradient(135deg, hsl(265 80% 60%), hsl(330 70% 55%))"
                : "hsl(240 12% 18%)",
            }}
          >
            {canSpin && !spinning && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ background: "linear-gradient(135deg, hsl(265 80% 65% / 0.5), hsl(330 70% 60% / 0.5))" }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {spinning ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Spinning...
                </>
              ) : canSpin ? (
                <>SPIN NOW ⚡</>
              ) : (
                <>
                  <Timer className="w-5 h-5" />
                  {timeLeft || "Cooldown"}
                </>
              )}
            </span>
          </Button>
        </motion.div>

        {/* Cooldown timer */}
        {!canSpin && timeLeft && (
          <motion.p
            className="text-muted-foreground text-xs mb-4 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Next spin in <span className="text-primary font-mono font-bold">{timeLeft}</span>
          </motion.p>
        )}

        {/* Streak bonus info */}
        {profile && profile.streak_count > 0 && (
          <motion.div
            className="glass-card rounded-xl px-4 py-3 text-center z-10 max-w-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-muted-foreground">
              <Flame className="w-3 h-3 inline mr-1 text-accent" />
              Streak bonus: <span className="text-accent font-bold">+{Math.min(profile.streak_count, 30)}% rewards</span>
            </p>
          </motion.div>
        )}

        {/* Reward Popup */}
        <AnimatePresence>
          {showReward && reward && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReward(false)}
            >
              {/* Confetti particles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ["hsl(265 80% 65%)", "hsl(330 70% 60%)", "hsl(42 90% 60%)", "hsl(200 80% 65%)", "hsl(160 60% 55%)"][i % 5],
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    scale: 0,
                    rotate: Math.random() * 720,
                  }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: Math.random() * 0.3 }}
                />
              ))}

              <motion.div
                className="glass-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center glow relative"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowReward(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
                >
                  {reward.type.startsWith("aurix") || reward.type === "mystery" ? (
                    <Coins className="w-20 h-20 text-aura-gold mx-auto mb-4 drop-shadow-[0_0_20px_hsl(42_90%_60%/0.6)]" />
                  ) : reward.type === "2x_boost" ? (
                    <Zap className="w-20 h-20 text-accent mx-auto mb-4 drop-shadow-[0_0_20px_hsl(330_70%_60%/0.6)]" />
                  ) : (
                    <Eye className="w-20 h-20 text-aura-sky mx-auto mb-4 drop-shadow-[0_0_20px_hsl(200_80%_65%/0.6)]" />
                  )}
                </motion.div>

                <motion.h2
                  className="font-display text-2xl font-bold text-foreground mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  🎉 You Won!
                </motion.h2>

                <motion.div
                  className="text-3xl font-display font-bold text-gradient-aurix aurix-glow mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  {getRewardLabel(reward.type, reward.amount)}
                </motion.div>

                {reward.streakBonus > 0 && (
                  <motion.p
                    className="text-xs text-aura-mint mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    🔥 Streak bonus applied: +{reward.streakBonus}%
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    onClick={() => setShowReward(false)}
                    className="gradient-primary text-primary-foreground glow-sm mt-2"
                  >
                    Claim Reward ✨
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
