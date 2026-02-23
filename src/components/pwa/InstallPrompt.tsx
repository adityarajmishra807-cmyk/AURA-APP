import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, Plus, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

export function InstallPrompt() {
  const { canPrompt, isIOSSafari, deferredPrompt, promptInstall, dismiss } = usePWAInstall();

  if (!canPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="absolute inset-0 bg-background/70 backdrop-blur-md"
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        >
          {/* Gradient border glow */}
          <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-primary via-accent to-primary opacity-60" />
          
          <div className="relative m-[1px] rounded-3xl bg-card/95 backdrop-blur-xl p-6">
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <motion.div
                animate={{ boxShadow: [
                  "0 0 20px hsl(265 80% 65% / 0.3)",
                  "0 0 40px hsl(265 80% 65% / 0.5)",
                  "0 0 20px hsl(265 80% 65% / 0.3)",
                ]}}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center"
              >
                <span className="text-3xl font-display font-black text-primary-foreground">A</span>
              </motion.div>
            </div>

            {/* Text */}
            <h2 className="text-xl font-display font-bold text-foreground text-center">
              Install Aura
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1.5 mb-6">
              Access faster. Stay ranked. Never miss a beat.
            </p>

            {isIOSSafari ? (
              /* iOS Instructions */
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Step 1</p>
                    <p className="text-xs text-muted-foreground">Tap the <strong>Share</strong> button below</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Step 2</p>
                    <p className="text-xs text-muted-foreground">Tap <strong>"Add to Home Screen"</strong></p>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              /* Chrome/Edge install button */
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={promptInstall}
                className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_hsl(var(--primary)/0.4)] mb-3"
              >
                <Download className="w-4.5 h-4.5" />
                Install Now
              </motion.button>
            ) : null}

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Not now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
