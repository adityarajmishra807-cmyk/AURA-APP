import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PostFeed } from "@/components/feed/PostFeed";
import { StreakClaimer } from "@/components/StreakClaimer";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, TrendingUp, TrendingDown, Flame } from "lucide-react";

const Index = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <StreakClaimer />
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-4 md:mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-display text-xl md:text-3xl font-bold text-foreground">
            Welcome, <span className="text-gradient">{profile?.username}</span> ✨
          </h1>
          <p className="text-muted-foreground mt-0.5 md:mt-1 text-xs md:text-base">Rate, post, and rise.</p>
        </motion.div>

        {/* Compact Stats - horizontal scroll on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-5 md:mb-8">
          <StatsCard
            title="AURIX"
            value={(profile?.aurix_balance || 0).toLocaleString()}
            icon={<Coins className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            accentColor="primary"
          />
          <StatsCard
            title="Earned"
            value={`+${profile?.aurix_lifetime_earned || 0}`}
            icon={<TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            accentColor="mint"
          />
          <StatsCard
            title="Lost"
            value={`-${profile?.aurix_lifetime_lost || 0}`}
            icon={<TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            accentColor="rose"
          />
          <StatsCard
            title="Streak"
            value={`${profile?.streak_count || 0}d`}
            icon={<Flame className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            accentColor="sky"
          />
        </div>

        {/* Feed */}
        <PostFeed />
      </div>
    </DashboardLayout>
  );
};

export default Index;
