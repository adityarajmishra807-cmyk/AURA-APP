import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full gradient-aura safe-area-top">
      <AppSidebar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1 p-3 md:p-8 overflow-auto pb-24 md:pb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <MobileBottomNav />
    </div>
  );
}
