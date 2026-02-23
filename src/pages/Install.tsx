import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Download, Monitor, Smartphone, CheckCircle2, Share, Plus, Chrome, Globe } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

export default function Install() {
  const { installed, isStandalone, deferredPrompt, promptInstall } = usePWAInstall();

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        const accepted = await promptInstall();
        if (accepted) {
          toast.success("Aura installed successfully!");
        }
      } catch {
        toast.error("Installation failed. Try using your browser's install option.");
      }
    } else {
      toast.info("Use your browser's menu to install Aura. See instructions below.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-8">
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Gradient border */}
          <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-primary/60 via-accent/40 to-primary/60" />

          <div className="relative m-[1px] rounded-3xl bg-card/90 backdrop-blur-xl p-6 md:p-8">
            {/* Hero icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px hsl(265 80% 65% / 0.2)",
                    "0 0 50px hsl(265 80% 65% / 0.4)",
                    "0 0 20px hsl(265 80% 65% / 0.2)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center"
              >
                <span className="text-4xl font-display font-black text-primary-foreground">A</span>
              </motion.div>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground text-center">
              Install <span className="text-gradient">Aura</span>
            </h1>
            <p className="text-muted-foreground text-sm text-center mt-2 mb-8 max-w-xs mx-auto">
              Launch instantly from your home screen. No browser. No distractions. Pure Aura.
            </p>

            {isStandalone || installed ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="w-16 h-16 rounded-full bg-aura-mint/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-aura-mint" />
                </div>
                <p className="font-display font-semibold text-foreground">You're all set!</p>
                <p className="text-xs text-muted-foreground">Aura is installed and ready to go.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Install button — always visible */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleInstall}
                  className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2.5 shadow-[0_4px_24px_hsl(var(--primary)/0.4)] mb-2"
                >
                  <Download className="w-5 h-5" />
                  Install Aura
                </motion.button>

                {/* iOS Safari instructions */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/20 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">iPhone & iPad</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Share className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Open in <strong>Safari</strong>, tap the <strong>Share</strong> button at the bottom
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </p>
                  </div>
                </div>

                {/* Desktop */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/20 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Desktop</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      In <strong>Chrome</strong> or <strong>Edge</strong>, click the install icon <strong>(⊕)</strong> in the address bar, or go to <strong>Menu → Install Aura</strong>
                    </p>
                  </div>
                </div>

                {/* Android */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/20 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Android</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Chrome className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      In <strong>Chrome</strong>, tap <strong>Menu (⋮) → Install app</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
