import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Send,
  MessageCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Feed", icon: LayoutDashboard, href: "/" },
  { label: "Chat", icon: MessageCircle, href: "/chat" },
  { label: "Board", icon: Trophy, href: "/leaderboard" },
  { label: "Send", icon: Send, href: "/transfer" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border/60 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full tap-scale"
              >
                {isActive && (
                  <motion.div
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    layoutId="mobileNavIndicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: 1 } : { scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive
                        ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                        : "text-muted-foreground"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
