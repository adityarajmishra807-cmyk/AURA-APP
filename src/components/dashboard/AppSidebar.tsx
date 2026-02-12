import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Trophy,
  Sparkles,
  Send,
  Settings,
  LogOut,
  Flame,
  Coins,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
  { label: "Transfer", icon: Send, href: "/transfer" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  return (
    <aside className="w-64 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col p-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-sm">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold text-gradient">Aura</span>
      </div>

      {/* AURIX Display */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-4 h-4 text-aura-gold" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AURIX Balance</span>
        </div>
        <p className="font-display text-2xl font-bold text-gradient-aurix aurix-glow">
          {profile?.aurix_balance?.toLocaleString() || "0"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Flame className="w-3 h-3 text-accent" />
          <span className="text-xs text-muted-foreground">
            {profile?.streak_count || 0} day streak
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary glow-sm"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="space-y-2">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <div className="glass-card rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-muted text-sm font-display font-bold">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                #{profile?.referral_code?.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
