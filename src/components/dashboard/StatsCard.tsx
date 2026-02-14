import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  className?: string;
  accentColor?: "primary" | "rose" | "mint" | "sky";
}

const accentMap = {
  primary: "from-primary/20 to-aura-lavender/20",
  rose: "from-aura-rose/20 to-accent/20",
  mint: "from-aura-mint/20 to-aura-sky/20",
  sky: "from-aura-sky/20 to-primary/20",
};

const iconBgMap = {
  primary: "bg-primary/10 text-primary",
  rose: "bg-aura-rose/10 text-aura-rose",
  mint: "bg-aura-mint/10 text-aura-mint",
  sky: "bg-aura-sky/10 text-aura-sky",
};

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  accentColor = "primary",
}: StatsCardProps) {
  return (
    <motion.div
      className={cn(
        "glass-card rounded-xl p-3 md:p-5 relative overflow-hidden group tap-scale",
        "md:hover:shadow-xl md:hover:shadow-primary/10 transition-shadow duration-300",
        className
      )}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block",
          accentMap[accentColor]
        )}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1.5 md:mb-3">
          <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn("p-1.5 md:p-2 rounded-lg", iconBgMap[accentColor])}>
            {icon}
          </div>
        </div>
        <motion.div
          className="font-display text-lg md:text-2xl font-bold tracking-tight text-foreground"
          key={value}
          initial={{ opacity: 0.5, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {value}
        </motion.div>
        {change && (
          <p
            className={cn("text-[10px] md:text-xs mt-1 md:mt-1.5 font-medium", {
              "text-aura-mint": changeType === "positive",
              "text-destructive": changeType === "negative",
              "text-muted-foreground": changeType === "neutral",
            })}
          >
            {change}
          </p>
        )}
      </div>
    </motion.div>
  );
}
