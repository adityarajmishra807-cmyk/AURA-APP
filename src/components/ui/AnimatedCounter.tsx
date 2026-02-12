import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  prefix?: string;
}

export function AnimatedCounter({ value, className, prefix = "" }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const diff = value - displayValue;
      const steps = Math.min(Math.abs(diff), 20);
      const stepSize = diff / steps;
      let current = displayValue;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current += stepSize;
        if (step >= steps) {
          current = value;
          clearInterval(interval);
          setIsAnimating(false);
        }
        setDisplayValue(Math.round(current));
      }, 30);

      return () => clearInterval(interval);
    }
  }, [value]);

  return (
    <motion.span
      className={cn(className)}
      animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}{displayValue.toLocaleString()}
    </motion.span>
  );
}
