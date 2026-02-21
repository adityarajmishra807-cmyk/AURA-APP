import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-8">
        <motion.div
          className="glass-card rounded-2xl p-6 md:p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
            <Download className="w-8 h-8 text-primary-foreground" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Install Aura</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Get the full app experience — faster loads, offline access, and home screen launch.
            </p>
          </div>

          {isStandalone || installed ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Already installed!</span>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} size="lg" className="w-full gradient-primary text-primary-foreground font-semibold">
              <Download className="w-4 h-4 mr-2" />
              Install Now
            </Button>
          ) : (
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                <Monitor className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Desktop (Chrome/Edge)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click the install icon (⊕) in your browser's address bar, or go to Menu → Install Aura.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Mobile</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <strong>iOS:</strong> Tap Share → "Add to Home Screen"<br />
                    <strong>Android:</strong> Tap Menu → "Install app"
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
