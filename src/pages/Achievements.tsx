import { useState, useEffect } from "react";
import { AchievementGridSkeleton } from "@/components/skeletons/Skeletons";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/hooks/useAchievements";
import { Award, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

interface AchievementProgress {
  key: string;
  current: number;
  threshold: number;
  percentage: number;
}

export default function Achievements() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      // Check for new achievements first
      await checkAchievements();

      const [{ data: all }, { data: earned }] = await Promise.all([
        supabase.from("achievements").select("key, name, description, icon, threshold"),
        supabase.from("user_achievements").select("achievement_key, unlocked_at").eq("user_id", user.id),
      ]);

      if (all) setAchievements(all as Achievement[]);
      if (earned) setUserAchievements(earned as UserAchievement[]);

      // Fetch progress counts
      const [
        { count: postCount },
        { count: friendCount },
        { count: ratingCount },
        { count: storyCount },
        { count: transferCount },
      ] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("friends").select("id", { count: "exact", head: true }).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("ratings").select("id", { count: "exact", head: true }).eq("rater_id", user.id),
        supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("transfers").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
      ]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("highest_streak, aurix_balance")
        .eq("user_id", user.id)
        .single();

      const progressMap: Record<string, AchievementProgress> = {};
      const thresholdMap: Record<string, number> = {};
      all?.forEach((a: any) => { thresholdMap[a.key] = a.threshold; });

      const currentValues: Record<string, number> = {
        first_post: postCount || 0,
        social_butterfly: friendCount || 0,
        streak_week: profile?.highest_streak || 0,
        streak_month: profile?.highest_streak || 0,
        century_rater: ratingCount || 0,
        aurix_rich: profile?.aurix_balance || 0,
        storyteller: storyCount || 0,
        generous: transferCount || 0,
      };

      Object.keys(currentValues).forEach((key) => {
        const threshold = thresholdMap[key] || 1;
        const current = Math.min(currentValues[key], threshold);
        progressMap[key] = {
          key,
          current,
          threshold,
          percentage: Math.round((current / threshold) * 100),
        };
      });

      setProgress(progressMap);
      setLoading(false);
    };

    fetchAll();
  }, [user, checkAchievements]);

  const earnedKeys = new Set(userAchievements.map((ua) => ua.achievement_key));
  const earnedCount = userAchievements.length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass-card rounded-2xl p-5 md:p-8 text-center animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 mx-auto mb-4" />
            <div className="h-6 w-40 bg-muted/60 rounded mx-auto mb-2" />
            <div className="h-4 w-56 bg-muted/40 rounded mx-auto" />
          </div>
          <AchievementGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="glass-card rounded-2xl p-5 md:p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 glow-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <Award className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            Achievements
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Unlock badges by reaching milestones on Aura
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {earnedCount} / {totalCount} Unlocked
            </span>
          </div>
        </motion.div>

        {/* Achievement grid */}
        <div className="grid gap-3 md:gap-4">
          {achievements.map((a, i) => {
            const earned = earnedKeys.has(a.key);
            const prog = progress[a.key];
            const ua = userAchievements.find((u) => u.achievement_key === a.key);

            return (
              <motion.div
                key={a.key}
                className={`glass-card rounded-2xl p-4 md:p-5 relative overflow-hidden transition-all ${
                  earned ? "border-primary/30" : ""
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Earned glow */}
                {earned && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                )}

                <div className="flex items-start gap-3 md:gap-4 relative z-10">
                  <motion.div
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl md:text-3xl shrink-0 ${
                      earned
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/30 border border-border/30 grayscale opacity-60"
                    }`}
                    whileHover={{ scale: 1.1, rotate: earned ? 10 : 0 }}
                  >
                    {a.icon}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-display font-bold text-sm md:text-base ${
                        earned ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {a.name}
                      </h3>
                      {earned ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>

                    {/* Progress bar */}
                    {prog && (
                      <div className="mt-2.5 space-y-1">
                        <Progress
                          value={prog.percentage}
                          className="h-2"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{prog.current} / {prog.threshold}</span>
                          {earned && ua ? (
                            <span className="text-primary">
                              Unlocked {new Date(ua.unlocked_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span>{prog.percentage}%</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
