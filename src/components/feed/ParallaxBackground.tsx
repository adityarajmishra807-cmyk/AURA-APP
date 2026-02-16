import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, useMotionValue } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export function ParallaxBackground() {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const saturation = useMotionValue(0);

  const { scrollY } = useScroll();

  // Parallax intensity — reduced 40% on mobile
  const bgFactor = isMobile ? 0.3 : 0.5;
  const glowFactor = isMobile ? 0.15 : 0.3;
  const maxOffset = isMobile ? 30 : 50;

  const bgY = useTransform(scrollY, [0, 1000], [0, maxOffset * bgFactor * -1]);
  const glowY = useTransform(scrollY, [0, 1000], [0, maxOffset * glowFactor * -1]);

  // Subtle saturation boost while scrolling (0 → 0.08)
  const bgSaturation = useTransform(scrollY, [0, 600], [0, isMobile ? 0.04 : 0.08]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Layer 1 — Deep gradient background */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: bgY }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, hsl(265 30% 14% / 0.8) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 80% 100%, hsl(330 25% 12% / 0.5) 0%, transparent 60%),
              linear-gradient(180deg, hsl(240 15% 8%) 0%, hsl(240 15% 6%) 100%)
            `,
          }}
        />
      </motion.div>

      {/* Layer 2 — Ambient glow (disabled movement on mobile) */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: isMobile ? 0 : glowY }}
      >
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full opacity-[0.12] md:opacity-[0.18]"
          style={{
            background: "radial-gradient(circle, hsl(265 80% 65% / 0.6) 0%, transparent 70%)",
            filter: isMobile ? "none" : "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full opacity-[0.06] md:opacity-[0.1]"
          style={{
            background: "radial-gradient(circle, hsl(330 70% 60% / 0.5) 0%, transparent 70%)",
            filter: isMobile ? "none" : "blur(30px)",
          }}
        />
      </motion.div>

      {/* Layer 3 — Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}
