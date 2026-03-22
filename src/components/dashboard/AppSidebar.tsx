import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  LayoutDashboard,
  Trophy,
  Sparkles,
  Send,
  Settings,
  LogOut,
  Flame,
  Coins,
  Gift,
  MessageCircle,
  Download,
  Swords,
} from "lucide-react";

const navItems = [
  { label: "Feed", icon: LayoutDashboard, href: "/" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "Battles", icon: Swords, href: "/battles" },
  { label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
  { label: "Transfer", icon: Send, href: "/transfer" },
  { label: "Referrals", icon: Gift, href: "/referrals" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { installed, isStandalone, deferredPrompt, promptInstall } = usePWAInstall();

  const showInstallButton = !installed && !isStandalone;

  return (
    <aside className="hidden md:flex w-64 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex-col p-4 shrink-0">
      {/* Logo + Install */}
      <div className="flex items-center justify-between px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-sm"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </motion.div>
          <span className="font-display text-xl font-bold text-gradient">Aura</span>
        </div>

        {showInstallButton && (
          <Link
            to="/install"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </Link>
        )}
      </div>

      {/* AURIX Display */}
      <motion.div
        className="glass-card rounded-xl p-4 mb-6"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-4 h-4 text-aura-gold" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AURIX Balance</span>
        </div>
        <AnimatedCounter
          value={profile?.aurix_balance || 0}
          className="font-display text-2xl font-bold text-gradient-aurix aurix-glow block"
        />
        <div className="flex items-center gap-2 mt-2">
          <Flame className="w-3 h-3 text-accent" />
          <span className="text-xs text-muted-foreground">
            {profile?.streak_count || 0} day streak
          </span>
        </div>
      </motion.div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-sidebar-accent glow-sm"
                  layoutId="activeNav"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </span>
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
