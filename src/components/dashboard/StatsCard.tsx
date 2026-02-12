import { ReactNode } from "react";
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
    <div
      className={cn(
        "glass-card rounded-xl p-6 relative overflow-hidden group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          accentMap[accentColor]
        )}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={cn("p-2.5 rounded-lg", iconBgMap[accentColor])}>
            {icon}
          </div>
        </div>
        <div className="font-display text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        {change && (
          <p
            className={cn("text-sm mt-2 font-medium", {
              "text-aura-mint": changeType === "positive",
              "text-destructive": changeType === "negative",
              "text-muted-foreground": changeType === "neutral",
            })}
          >
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
