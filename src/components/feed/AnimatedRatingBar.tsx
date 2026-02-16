import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { RatingParticles } from "./RatingParticles";
import { Coins } from "lucide-react";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface AnimatedRatingBarProps {
  value: number | null;
  onChange: (value: number) => void;
  onCommit: (value: number) => Promise<void>;
  min?: number;
  max?: number;
  step?: number;
  thresholdSpark?: number;
  disabled?: boolean;
  className?: string;
}

function getStepColor(value: number, min: number, max: number): string {
  const fraction = (value - min) / (max - min);
  if (fraction < 0.4) return "#FF6B6B";
  if (fraction > 0.6) return "#7BE495";
  return "#8A8A8A";
}

function getTrackGradient(min: number, max: number): string {
  return `linear-gradient(to right, #FF6B6B, #8A8A8A, #7BE495)`;
}

export function AnimatedRatingBar({
  value,
  onChange,
  onCommit,
  min = -10,
  max = 10,
  step = 1,
  thresholdSpark = 8,
  disabled = false,
  className,
}: AnimatedRatingBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? 0);
  const [committed, setCommitted] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0 });
  const lastCommitTime = useRef(0);

  const totalSteps = (max - min) / step;
  const fraction = (localValue - min) / (max - min);

  const springX = useSpring(fraction * 100, {
    stiffness: 300,
    damping: 28,
  });

  // Keep spring in sync
  useEffect(() => {
    springX.set(fraction * 100);
  }, [fraction, springX]);

  const thumbLeft = useTransform(springX, (v) => `${v}%`);

  const currentColor = useMemo(
    () => getStepColor(localValue, min, max),
    [localValue, min, max]
  );

  const clampSnap = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      return Math.round(clamped / step) * step;
    },
    [min, max, step]
  );

  const getValueFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return clampSnap(min + frac * (max - min));
    },
    [min, max, clampSnap]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const v = getValueFromPointer(e.clientX);
      setLocalValue(v);
      onChange(v);
    },
    [disabled, getValueFromPointer, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const v = getValueFromPointer(e.clientX);
      setLocalValue(v);
      onChange(v);
    },
    [isDragging, getValueFromPointer, onChange]
  );

  const triggerCommit = useCallback(
    async (v: number) => {
      const now = Date.now();
      if (now - lastCommitTime.current < 2000) return;
      lastCommitTime.current = now;

      // Haptic
      if (!prefersReducedMotion && navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Spark check
      if (Math.abs(v) >= thresholdSpark) {
        if (trackRef.current) {
          const rect = trackRef.current.getBoundingClientRect();
          const frac = (v - min) / (max - min);
          setParticlePos({
            x: frac * rect.width,
            y: rect.height / 2,
          });
        }
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 500);
      }

      setCommitted(true);
      setTimeout(() => setCommitted(false), 150);

      await onCommit(v);
    },
    [min, max, thresholdSpark, onCommit]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      // Commit on release if value != 0
      if (localValue !== 0) {
        triggerCommit(localValue);
      }
    },
    [isDragging, localValue, triggerCommit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let newVal = localValue;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        newVal = clampSnap(localValue + step);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        newVal = clampSnap(localValue - step);
        e.preventDefault();
      } else if (e.key === "Enter" && localValue !== 0) {
        triggerCommit(localValue);
        e.preventDefault();
        return;
      } else if (e.key === "Home") {
        newVal = min;
        e.preventDefault();
      } else if (e.key === "End") {
        newVal = max;
        e.preventDefault();
      }
      if (newVal !== localValue) {
        setLocalValue(newVal);
        onChange(newVal);
      }
    },
    [disabled, localValue, step, clampSnap, min, max, onChange, triggerCommit]
  );

  const handleTapStep = useCallback(
    (stepValue: number) => {
      if (disabled) return;
      setLocalValue(stepValue);
      onChange(stepValue);
    },
    [disabled, onChange]
  );

  // Build step markers
  const steps = useMemo(() => {
    const arr: number[] = [];
    for (let v = min; v <= max; v += step) arr.push(v);
    return arr;
  }, [min, max, step]);

  // Announce value for screen readers
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (committed) {
      setAnnouncement(`Rating committed: ${localValue}`);
    }
  }, [committed, localValue]);

  return (
    <div className={cn("relative select-none", className)}>
      {/* SR announcement */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Value preview */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Coins className="w-3 h-3 text-aura-gold" />
          Rate
        </span>
        <motion.span
          className="font-display text-base font-bold tabular-nums flex items-center gap-1"
          style={{ color: currentColor }}
          key={localValue}
          initial={prefersReducedMotion ? false : { scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {localValue > 0 ? `+${localValue}` : localValue}
          <Coins className="w-3 h-3 text-aura-gold" />
        </motion.span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-8 md:h-7 flex items-center cursor-pointer"
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-label="Post rating"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {/* Background track */}
        <div
          className="absolute left-0 right-0 h-3.5 rounded-full overflow-hidden"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            background: getTrackGradient(min, max),
            opacity: 0.25,
          }}
        />

        {/* Glow trail behind thumb */}
        <motion.div
          className="absolute h-3.5 rounded-full transition-none pointer-events-none"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: `${Math.min(fraction, 0.5) * 100}%`,
            width: `${Math.abs(fraction - 0.5) * 100}%`,
            background: currentColor,
            opacity: isDragging ? 0.6 : 0.4,
            filter: `blur(${isDragging ? 4 : 2}px)`,
          }}
        />

        {/* Filled track */}
        <div
          className="absolute h-3.5 rounded-full transition-none"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: `${Math.min(fraction, 0.5) * 100}%`,
            width: `${Math.abs(fraction - 0.5) * 100}%`,
            background: currentColor,
            opacity: 0.5,
          }}
        />

        {/* Step dots */}
        <div className="absolute left-0 right-0 flex justify-between px-0" style={{ top: "50%", transform: "translateY(-50%)" }}>
          {steps.filter((_, i) => i % 5 === 0).map((s) => {
            const pos = ((s - min) / (max - min)) * 100;
            return (
              <div
                key={s}
                className="absolute w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTapStep(s);
                }}
              />
            );
          })}
        </div>

        {/* Center marker */}
        <div
          className="absolute w-0.5 h-5 bg-muted-foreground/40 rounded-full pointer-events-none"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        />

        {/* Thumb — Aurix Coin */}
        <motion.div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10",
            "flex items-center justify-center",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          style={{
            left: thumbLeft,
            willChange: "transform",
            minWidth: 44,
            minHeight: 44,
          }}
          animate={
            committed && !prefersReducedMotion
              ? { scale: [0.92, 1.12, 1], rotate: [0, 8, -4, 0] }
              : isDragging
              ? { scale: 1.15 }
              : { scale: 1 }
          }
          transition={
            committed
              ? { duration: 0.25, ease: "easeOut" }
              : { type: "spring", stiffness: 400, damping: 22 }
          }
        >
          <div
            className="relative w-7 h-7 md:w-6 md:h-6 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 35% 35%, #FFD700, #B8860B)`,
              boxShadow: isDragging
                ? `0 0 16px 4px ${currentColor}55, 0 0 24px 2px #FFD70044`
                : `0 2px 8px -2px #00000044, 0 0 10px -2px #FFD70033`,
              border: `2px solid #FFD70088`,
            }}
          >
            <Coins className="w-3.5 h-3.5 md:w-3 md:h-3 text-yellow-900 drop-shadow-sm" />
          </div>
        </motion.div>

        {/* Particles */}
        <RatingParticles
          active={showParticles}
          color={currentColor}
          x={particlePos.x}
          y={particlePos.y}
          count={10}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1 text-[10px] md:text-xs text-muted-foreground">
        <span className="text-destructive">−{Math.abs(min)}</span>
        <span>0</span>
        <span className="text-aura-mint">+{max}</span>
      </div>
    </div>
  );
}
