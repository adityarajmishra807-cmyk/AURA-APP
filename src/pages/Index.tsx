import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MiniChart } from "@/components/dashboard/MiniChart";
import { Users, TrendingUp, Zap, Eye } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Good morning, Alex ✨
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your projects today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Users"
            value="12,847"
            change="+12.5% from last month"
            changeType="positive"
            icon={<Users className="w-4 h-4" />}
            accentColor="primary"
          />
          <StatsCard
            title="Revenue"
            value="$48.2K"
            change="+8.2% from last month"
            changeType="positive"
            icon={<TrendingUp className="w-4 h-4" />}
            accentColor="mint"
          />
          <StatsCard
            title="Active Sessions"
            value="1,429"
            change="-3.1% from yesterday"
            changeType="negative"
            icon={<Zap className="w-4 h-4" />}
            accentColor="rose"
          />
          <StatsCard
            title="Page Views"
            value="89.4K"
            change="+18.7% from last week"
            changeType="positive"
            icon={<Eye className="w-4 h-4" />}
            accentColor="sky"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MiniChart />
          </div>
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
