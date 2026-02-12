import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PostFeed } from "@/components/feed/PostFeed";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, TrendingUp, TrendingDown, Flame } from "lucide-react";

const Index = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome, <span className="text-gradient">{profile?.username}</span> ✨
          </h1>
          <p className="text-muted-foreground mt-1">
            Rate, post, and rise.
          </p>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatsCard
            title="AURIX"
            value={(profile?.aurix_balance || 0).toLocaleString()}
            icon={<Coins className="w-4 h-4" />}
            accentColor="primary"
          />
          <StatsCard
            title="Earned"
            value={`+${profile?.aurix_lifetime_earned || 0}`}
            icon={<TrendingUp className="w-4 h-4" />}
            accentColor="mint"
          />
          <StatsCard
            title="Lost"
            value={`-${profile?.aurix_lifetime_lost || 0}`}
            icon={<TrendingDown className="w-4 h-4" />}
            accentColor="rose"
          />
          <StatsCard
            title="Streak"
            value={`${profile?.streak_count || 0}d`}
            icon={<Flame className="w-4 h-4" />}
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
