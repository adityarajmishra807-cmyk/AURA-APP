import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const y = useMotionValue(0);
  const progress = useTransform(y, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 360]);
  const opacity = useTransform(y, [0, 30, THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(y, [0, THRESHOLD], [0.5, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Rubber-band effect
    const dampened = Math.min(delta * 0.45, THRESHOLD * 1.5);
    y.set(dampened);
  }, [refreshing, y]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (y.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(y, THRESHOLD * 0.7, { type: "spring", stiffness: 300, damping: 25 });
      await onRefresh();
      setRefreshing(false);
    }
    animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
  }, [y, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 flex items-center justify-center"
        style={{ y, opacity }}
      >
        <motion.div
          className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center backdrop-blur-sm"
          style={{ scale }}
        >
          <motion.div style={{ rotate }}>
            <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? "animate-spin" : ""}`} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content shifts down */}
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
