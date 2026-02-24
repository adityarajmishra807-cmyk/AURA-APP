import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
}

interface UserAchievement {
  achievement_key: string;
  unlocked_at: string;
}

interface BadgeDisplayProps {
  userId: string;
  compact?: boolean;
}

export function BadgeDisplay({ userId, compact = false }: BadgeDisplayProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: all }, { data: earned }] = await Promise.all([
        supabase.from("achievements").select("key, name, description, icon, threshold"),
        supabase.from("user_achievements").select("achievement_key, unlocked_at").eq("user_id", userId),
      ]);
      if (all) setAchievements(all as Achievement[]);
      if (earned) setUserAchievements(earned as UserAchievement[]);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading || achievements.length === 0) return null;

  const earnedKeys = new Set(userAchievements.map((ua) => ua.achievement_key));
  const earnedAchievements = achievements.filter((a) => earnedKeys.has(a.key));

  if (earnedAchievements.length === 0 && compact) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {(compact ? earnedAchievements : achievements).map((a, i) => {
          const earned = earnedKeys.has(a.key);
          return (
            <Tooltip key={a.key}>
              <TooltipTrigger asChild>
                <motion.div
                  className={`inline-flex items-center justify-center rounded-lg text-base md:text-lg cursor-default ${
                    compact ? "w-7 h-7" : "w-9 h-9"
                  } ${
                    earned
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 border border-border/30 opacity-40 grayscale"
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.15 }}
                >
                  {a.icon}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="font-semibold text-xs">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">{a.description}</p>
                {earned && (
                  <p className="text-[10px] text-aura-mint mt-0.5">✓ Unlocked</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
