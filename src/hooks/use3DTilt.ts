import { useRef, useCallback, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

interface Use3DTiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
}

export function use3DTilt({
  maxTilt = 8,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
}: Use3DTiltOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: speed, damping: 30 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
  const scaleVal = useSpring(1, springConfig);

  // Glare position
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const normalX = (e.clientX - rect.left) / rect.width - 0.5;
    const normalY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(normalX);
    y.set(normalY);
  }, [x, y]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    scaleVal.set(scale);
  }, [scale, scaleVal]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    x.set(0);
    y.set(0);
    scaleVal.set(1);
  }, [x, y, scaleVal]);

  // Touch support
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!ref.current || !e.touches[0]) return;
    const rect = ref.current.getBoundingClientRect();
    const normalX = (e.touches[0].clientX - rect.left) / rect.width - 0.5;
    const normalY = (e.touches[0].clientY - rect.top) / rect.height - 0.5;
    x.set(normalX);
    y.set(normalY);
    scaleVal.set(scale);
    setIsHovering(true);
  }, [x, y, scale, scaleVal]);

  const handleTouchEnd = useCallback(() => {
    x.set(0);
    y.set(0);
    scaleVal.set(1);
    setIsHovering(false);
  }, [x, y, scaleVal]);

  return {
    ref,
    style: {
      rotateX,
      rotateY,
      scale: scaleVal,
      transformPerspective: perspective,
      transformStyle: "preserve-3d" as const,
    },
    glareStyle: {
      backgroundPosition: useTransform(
        [glareX, glareY],
        ([gx, gy]) => `${gx}% ${gy}%`
      ),
    },
    isHovering,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
