import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import { IncomingCallModal } from "@/components/chat/IncomingCallModal";

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { incomingCall, dismiss } = useIncomingCall();

  return (
    <div className="min-h-screen w-full gradient-aura flex flex-col md:flex-row">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
        {/* Mobile notification bell */}
        <div className="flex justify-end mb-2 pt-2 md:pt-0 md:mb-0 md:absolute md:top-6 md:right-8 z-20">
          <NotificationBell />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileBottomNav />

      {/* Global incoming call overlay */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal call={incomingCall} onDismiss={dismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}
