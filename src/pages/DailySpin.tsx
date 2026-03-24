import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Coins, Sparkles, Zap, Eye, Gift, Timer, X } from "lucide-react";
import { toast } from "sonner";

const SEGMENTS = [
  { label: "+10", type: "aurix_10", color: "#7c3aed", darkColor: "#5b21b6", icon: "💰", amount: 10 },
  { label: "2x Boost", type: "2x_boost", color: "#ec4899", darkColor: "#be185d", icon: "⚡", amount: 0 },
  { label: "+25", type: "aurix_25", color: "#0ea5e9", darkColor: "#0369a1", icon: "💎", amount: 25 },
  { label: "+50", type: "aurix_50", color: "#10b981", darkColor: "#047857", icon: "🔥", amount: 50 },
  { label: "Visibility", type: "visibility_boost", color: "#f59e0b", darkColor: "#b45309", icon: "👁️", amount: 0 },
  { label: "+100", type: "aurix_100", color: "#8b5cf6", darkColor: "#6d28d9", icon: "⭐", amount: 100 },
  { label: "Mystery", type: "mystery", color: "#d946ef", darkColor: "#a21caf", icon: "🎁", amount: 0 },
  { label: "+25", type: "aurix_25b", color: "#06b6d4", darkColor: "#0e7490", icon: "💠", amount: 25 },
];

const NUM = SEGMENTS.length;
const ARC = 360 / NUM;

function getRewardLabel(type: string, amount: number) {
  if (type === "2x_boost") return "2x Rating Boost ⚡";
  if (type === "visibility_boost") return "Visibility Boost 👁️";
  if (type === "mystery") return `Mystery: +${amount} AURIX ✨`;
  return `+${amount} AURIX`;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---- Neon LED dots around the rim ---- */
function RimLights({ spinning }: { spinning: boolean }) {
  const dots = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  return (
    <div className="absolute inset-[-6px] rounded-full pointer-events-none z-10">
      {dots.map((i) => {
        const deg = (360 / 24) * i;
        const rad = (deg * Math.PI) / 180;
        const r = 50;
        return (
          <motion.div
            key={i}
            className="absolute w-[5px] h-[5px] rounded-full"
            style={{
              left: `calc(50% + ${r * Math.cos(rad)}% - 2.5px)`,
              top: `calc(50% + ${r * Math.sin(rad)}% - 2.5px)`,
              backgroundColor: i % 2 === 0 ? "#a855f7" : "#f59e0b",
              boxShadow: `0 0 6px ${i % 2 === 0 ? "#a855f7" : "#f59e0b"}`,
            }}
            animate={
              spinning
                ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }
                : { opacity: [0.5, 1, 0.5] }
            }
            transition={{
              duration: spinning ? 0.4 : 2,
              repeat: Infinity,
              delay: (i * (spinning ? 0.03 : 0.08)),
            }}
          />
        );
      })}
    </div>
  );
}

export default function DailySpin() {
  const { profile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [reward, setReward] = useState<{ type: string; amount: number; streakBonus: number } | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [canSpin, setCanSpin] = useState(true);
  const [idlePulse, setIdlePulse] = useState(true);
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
          const next = new Date(new Date(data[0].spun_at).getTime() + 86400000);
          if (next > new Date()) {
            setCooldownEnd(next);
            setCanSpin(false);
          }
        }
      });
  }, [profile]);

  // Countdown
  useEffect(() => {
    if (!cooldownEnd) return;
    const tick = () => {
      const diff = cooldownEnd.getTime() - Date.now();
      if (diff <= 0) { setCanSpin(true); setCooldownEnd(null); setTimeLeft(""); }
      else setTimeLeft(fmt(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const handleSpin = useCallback(async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setIdlePulse(false);

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
      setIdlePulse(true);
      return;
    }

    // Find the matching segment index
    let segIdx = SEGMENTS.findIndex((s) => s.type === res.reward_type);
    if (segIdx < 0) {
      // For aurix_25 the RPC returns "aurix_25" but we have "aurix_25" and "aurix_25b"
      segIdx = SEGMENTS.findIndex((s) => s.type.startsWith(res.reward_type));
    }
    if (segIdx < 0) segIdx = 0;

    // The pointer is at the TOP (12 o'clock = -90°).
    // Segment i spans from (i * ARC) to ((i+1) * ARC) degrees in SVG space (starting at -90°).
    // We need the wheel to rotate so that the midpoint of segIdx aligns with the pointer.
    // segCenter in wheel-local degrees from the start: segIdx * ARC + ARC/2
    // To bring that to the top, we rotate by -(segCenter) + but since CSS rotates clockwise
    // and our SVG segments start at -90°, the target is: 360 - (segIdx * ARC + ARC/2)
    const segCenter = segIdx * ARC + ARC / 2;
    const landAngle = 360 - segCenter; // where the pointer would point
    const fullSpins = 6 * 360; // 6 full rotations for drama
    const jitter = (Math.random() - 0.5) * (ARC * 0.6); // randomize within segment
    const targetRotation = currentRotation + fullSpins + landAngle - (currentRotation % 360) + jitter;

    setCurrentRotation(targetRotation);

    await wheelControls.start({
      rotate: targetRotation,
      transition: {
        duration: 5,
        ease: [0.15, 0.85, 0.25, 1], // dramatic deceleration
      },
    });

    // Small bounce at end
    await wheelControls.start({
      rotate: targetRotation + 2,
      transition: { duration: 0.15, ease: "easeOut" },
    });
    await wheelControls.start({
      rotate: targetRotation - 1,
      transition: { duration: 0.12, ease: "easeInOut" },
    });
    await wheelControls.start({
      rotate: targetRotation,
      transition: { duration: 0.1, ease: "easeIn" },
    });

    setReward({ type: res.reward_type, amount: res.reward_amount, streakBonus: res.streak_bonus });
    setShowReward(true);
    setSpinning(false);
    setCanSpin(false);
    setCooldownEnd(new Date(Date.now() + 86400000));
    refreshProfile();
  }, [spinning, canSpin, currentRotation, wheelControls, refreshProfile]);

  // Background particles (memoized)
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 4 + Math.random() * 4,
        delay: Math.random() * 4,
      })),
    []
  );

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-start px-4 py-6 overflow-hidden">
        {/* Ambient glow behind wheel */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(265 80% 60% / 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Background stars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-primary/40"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
              animate={{ y: [0, -20, 0], opacity: [0.1, 0.7, 0.1], scale: [1, 1.5, 1] }}
              transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div
          className="text-center mb-5 relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Daily Spin 🎯</h1>
          <p className="text-muted-foreground text-sm">Spin to earn AURIX & boosts</p>
          {profile && (
            <motion.div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs text-accent font-bold">{profile.streak_count} Day Streak</span>
            </motion.div>
          )}
        </motion.div>

        {/* 3D Wheel Container */}
        <div
          className="relative mb-6 z-10"
          style={{
            width: 320,
            height: 320,
            perspective: "800px",
          }}
        >
          {/* Outer neon ring */}
          <motion.div
            className="absolute inset-[-4px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #7c3aed, #ec4899, #0ea5e9, #10b981, #f59e0b, #8b5cf6, #d946ef, #7c3aed)",
              padding: 3,
            }}
            animate={spinning ? { rotate: [0, 360] } : {}}
            transition={spinning ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
          >
            <div className="w-full h-full rounded-full bg-background" />
          </motion.div>

          {/* LED rim lights */}
          <RimLights spinning={spinning} />

          {/* Pointer at top */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30">
            <motion.div
              animate={spinning ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
            >
              <div className="relative">
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: "14px solid transparent",
                    borderRight: "14px solid transparent",
                    borderTop: "24px solid #a855f7",
                    filter: "drop-shadow(0 0 12px #a855f7) drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
                  }}
                />
                <div
                  className="absolute top-[2px] left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "14px solid #c084fc",
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* The wheel with 3D tilt */}
          <motion.div
            className="absolute inset-[3px] rounded-full overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              boxShadow: `
                0 20px 60px -15px rgba(124, 58, 237, 0.4),
                0 10px 30px -10px rgba(0, 0, 0, 0.6),
                inset 0 2px 4px rgba(255,255,255,0.1),
                inset 0 -4px 8px rgba(0,0,0,0.3)
              `,
            }}
            animate={wheelControls}
            initial={{ rotate: 0 }}
          >
            {/* Idle wobble */}
            <motion.div
              className="w-full h-full"
              animate={idlePulse && !spinning ? { rotateX: [0, 3, 0, -3, 0], rotateY: [0, -3, 0, 3, 0] } : {}}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <svg viewBox="0 0 300 300" className="w-full h-full">
                <defs>
                  {SEGMENTS.map((seg, i) => (
                    <radialGradient key={`g${i}`} id={`seg-grad-${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="30%" stopColor={seg.color} />
                      <stop offset="100%" stopColor={seg.darkColor} />
                    </radialGradient>
                  ))}
                  <filter id="inner-shadow">
                    <feFlood floodColor="rgba(0,0,0,0.3)" />
                    <feComposite in2="SourceAlpha" operator="in" />
                    <feGaussianBlur stdDeviation="3" />
                    <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {SEGMENTS.map((seg, i) => {
                  const start = i * ARC - 90;
                  const end = start + ARC;
                  const sr = (start * Math.PI) / 180;
                  const er = (end * Math.PI) / 180;
                  const x1 = 150 + 148 * Math.cos(sr);
                  const y1 = 150 + 148 * Math.sin(sr);
                  const x2 = 150 + 148 * Math.cos(er);
                  const y2 = 150 + 148 * Math.sin(er);

                  const mid = start + ARC / 2;
                  const mr = (mid * Math.PI) / 180;
                  const iconR = 100;
                  const labelR = 75;
                  const ix = 150 + iconR * Math.cos(mr);
                  const iy = 150 + iconR * Math.sin(mr);
                  const lx = 150 + labelR * Math.cos(mr);
                  const ly = 150 + labelR * Math.sin(mr);

                  return (
                    <g key={i}>
                      <path
                        d={`M 150 150 L ${x1} ${y1} A 148 148 0 0 1 ${x2} ${y2} Z`}
                        fill={`url(#seg-grad-${i})`}
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="1.5"
                        filter="url(#inner-shadow)"
                      />
                      {/* Highlight edge */}
                      <path
                        d={`M 150 150 L ${x1} ${y1} A 148 148 0 0 1 ${x2} ${y2} Z`}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                      <text
                        x={ix}
                        y={iy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="20"
                        transform={`rotate(${mid}, ${ix}, ${iy})`}
                      >
                        {seg.icon}
                      </text>
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        transform={`rotate(${mid}, ${lx}, ${ly})`}
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}

                {/* Center hub - 3D look */}
                <circle cx="150" cy="150" r="32" fill="url(#center-grad)" stroke="#7c3aed" strokeWidth="2.5" />
                <circle cx="150" cy="150" r="26" fill="#0f0a1a" stroke="#a855f7" strokeWidth="1" />
                <text x="150" y="146" textAnchor="middle" dominantBaseline="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" letterSpacing="1">
                  AURIX
                </text>
                <text x="150" y="158" textAnchor="middle" dominantBaseline="middle" fill="#a78bfa" fontSize="7">
                  SPIN
                </text>

                <defs>
                  <radialGradient id="center-grad" cx="40%" cy="35%">
                    <stop offset="0%" stopColor="#1e1535" />
                    <stop offset="100%" stopColor="#0a0510" />
                  </radialGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>

          {/* 3D shadow / reflection below wheel */}
          <div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-6 rounded-[100%]"
            style={{
              background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)",
              filter: "blur(10px)",
              transform: "scaleY(0.5)",
            }}
          />
        </div>

        {/* Spin Button */}
        <motion.div
          className="relative z-10 mb-4"
          whileTap={canSpin && !spinning ? { scale: 0.93 } : {}}
          whileHover={canSpin && !spinning ? { scale: 1.05 } : {}}
        >
          <Button
            onClick={handleSpin}
            disabled={!canSpin || spinning}
            className="relative h-14 px-12 text-lg font-display font-bold rounded-2xl border-0 overflow-hidden disabled:opacity-30 text-white"
            style={{
              background: canSpin
                ? "linear-gradient(135deg, #7c3aed, #ec4899)"
                : "hsl(240 12% 16%)",
              boxShadow: canSpin
                ? "0 8px 32px -8px rgba(124,58,237,0.5), 0 0 0 1px rgba(124,58,237,0.2)"
                : "none",
            }}
          >
            {canSpin && !spinning && (
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {canSpin && !spinning && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: "0 0 30px rgba(124,58,237,0.6)" }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {spinning ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Spinning...
                </>
              ) : canSpin ? (
                <>SPIN NOW ⚡</>
              ) : (
                <>
                  <Timer className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{timeLeft || "Cooldown"}</span>
                </>
              )}
            </span>
          </Button>
        </motion.div>

        {/* Cooldown */}
        {!canSpin && timeLeft && (
          <motion.p className="text-muted-foreground text-xs mb-4 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Next spin in <span className="text-primary font-mono font-bold">{timeLeft}</span>
          </motion.p>
        )}

        {/* Streak bonus */}
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReward(false)}
            >
              {/* Confetti burst */}
              {Array.from({ length: 40 }).map((_, i) => {
                const colors = ["#7c3aed", "#ec4899", "#f59e0b", "#0ea5e9", "#10b981", "#d946ef"];
                const angle = (360 / 40) * i;
                const dist = 100 + Math.random() * 200;
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-sm"
                    style={{
                      width: 4 + Math.random() * 6,
                      height: 4 + Math.random() * 6,
                      backgroundColor: colors[i % colors.length],
                      left: "50%",
                      top: "50%",
                      boxShadow: `0 0 6px ${colors[i % colors.length]}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{
                      x: Math.cos(rad) * dist,
                      y: Math.sin(rad) * dist + 100,
                      opacity: 0,
                      scale: 0,
                      rotate: Math.random() * 720 - 360,
                    }}
                    transition={{ duration: 1.2 + Math.random() * 0.5, ease: "easeOut", delay: Math.random() * 0.2 }}
                  />
                );
              })}

              {/* Glow burst */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 300,
                  height: 300,
                  background: "radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)",
                  left: "50%",
                  top: "50%",
                  marginLeft: -150,
                  marginTop: -150,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />

              <motion.div
                className="glass-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center relative overflow-hidden"
                style={{
                  boxShadow: "0 0 60px -15px rgba(124,58,237,0.4), 0 25px 50px -12px rgba(0,0,0,0.4)",
                }}
                initial={{ scale: 0.3, opacity: 0, rotateX: 30 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Shimmer overlay */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 60%)",
                  }}
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />

                <button
                  onClick={() => setShowReward(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
                >
                  {reward.type.startsWith("aurix") || reward.type === "mystery" ? (
                    <Coins className="w-20 h-20 mx-auto mb-4" style={{ color: "#f59e0b", filter: "drop-shadow(0 0 24px rgba(245,158,11,0.6))" }} />
                  ) : reward.type === "2x_boost" ? (
                    <Zap className="w-20 h-20 mx-auto mb-4" style={{ color: "#ec4899", filter: "drop-shadow(0 0 24px rgba(236,72,153,0.6))" }} />
                  ) : (
                    <Eye className="w-20 h-20 mx-auto mb-4" style={{ color: "#0ea5e9", filter: "drop-shadow(0 0 24px rgba(14,165,233,0.6))" }} />
                  )}
                </motion.div>

                <motion.h2
                  className="font-display text-2xl font-bold text-foreground mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  🎉 You Won!
                </motion.h2>

                <motion.div
                  className="text-3xl font-display font-bold text-gradient-aurix aurix-glow mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring" }}
                >
                  {getRewardLabel(reward.type, reward.amount)}
                </motion.div>

                {reward.streakBonus > 0 && (
                  <motion.p
                    className="text-xs text-aura-mint mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    🔥 Streak bonus applied: +{reward.streakBonus}%
                  </motion.p>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <Button
                    onClick={() => setShowReward(false)}
                    className="gradient-primary text-primary-foreground glow-sm mt-2 font-bold"
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
