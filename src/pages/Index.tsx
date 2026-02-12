import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, TrendingUp, TrendingDown, Flame, Trophy, Zap } from "lucide-react";

const Index = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back, <span className="text-gradient">{profile?.username}</span> ✨
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AURIX is waiting. Rate, post, and rise.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="AURIX Balance"
            value={(profile?.aurix_balance || 0).toLocaleString()}
            icon={<Coins className="w-4 h-4" />}
            accentColor="primary"
          />
          <StatsCard
            title="Lifetime Earned"
            value={(profile?.aurix_lifetime_earned || 0).toLocaleString()}
            change="Total AURIX gained"
            changeType="positive"
            icon={<TrendingUp className="w-4 h-4" />}
            accentColor="mint"
          />
          <StatsCard
            title="Lifetime Lost"
            value={(profile?.aurix_lifetime_lost || 0).toLocaleString()}
            change="Total AURIX lost"
            changeType="negative"
            icon={<TrendingDown className="w-4 h-4" />}
            accentColor="rose"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Current Streak"
            value={`${profile?.streak_count || 0} days`}
            change={`Best: ${profile?.highest_streak || 0} days`}
            changeType="neutral"
            icon={<Flame className="w-4 h-4" />}
            accentColor="rose"
          />
          <StatsCard
            title="Today's Earnings"
            value={`+${profile?.aurix_daily_earnings || 0}`}
            icon={<Zap className="w-4 h-4" />}
            accentColor="sky"
          />
          <StatsCard
            title="Rank"
            value="—"
            change="Coming soon"
            changeType="neutral"
            icon={<Trophy className="w-4 h-4" />}
            accentColor="primary"
          />
        </div>

        {/* Placeholder for feed */}
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 glow">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            Feed Coming Soon
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            In Phase 2, you'll see posts from other users here and rate them from −10 to +10 AURIX.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
