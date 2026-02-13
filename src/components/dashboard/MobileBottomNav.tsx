import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Send,
  Gift,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Feed", icon: LayoutDashboard, href: "/" },
  { label: "Board", icon: Trophy, href: "/leaderboard" },
  { label: "Send", icon: Send, href: "/transfer" },
  { label: "Refer", icon: Gift, href: "/referrals" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-[3rem]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
