import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineBadge() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[300] flex justify-center safe-area-top"
        >
          <div className="mt-2 px-4 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 shadow-lg">
            <WifiOff className="w-3 h-3" />
            Offline Mode
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
