import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

interface RatingParticlesProps {
  active: boolean;
  color: string;
  x: number;
  y: number;
  count?: number;
  onComplete?: () => void;
}

const isLowEnd =
  typeof navigator !== "undefined" &&
  (navigator.hardwareConcurrency ?? 4) <= 2;

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 30 - 15,
    distance: 28 + Math.random() * 24,
    size: 3 + Math.random() * 3,
    delay: Math.random() * 0.05,
  }));
}

export const RatingParticles = memo(function RatingParticles({
  active,
  color,
  x,
  y,
  count = 10,
  onComplete,
}: RatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const effectiveCount = prefersReducedMotion ? 0 : isLowEnd ? Math.min(count, 4) : count;

  useEffect(() => {
    if (active && effectiveCount > 0) {
      setParticles(generateParticles(effectiveCount));
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, effectiveCount, onComplete]);

  if (prefersReducedMotion || effectiveCount === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 20 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.distance;
          const ty = Math.sin(rad) * p.distance;
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: x,
                top: y,
                width: p.size,
                height: p.size,
                backgroundColor: color,
                willChange: "transform, opacity",
              }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: tx,
                y: ty,
                scale: 0.3,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.35 + Math.random() * 0.1,
                ease: "easeOut",
                delay: p.delay,
              }}
            />
          );
        })}
      </AnimatePresence>

      {/* Glow ripple */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute rounded-full"
            style={{
              left: x - 16,
              top: y - 16,
              width: 32,
              height: 32,
              background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
              willChange: "transform, opacity",
            }}
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
