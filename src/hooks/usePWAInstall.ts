import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && isSafari;

  useEffect(() => {
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem("aura_install_dismissed");
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt)) / 3600000;
      if (hoursSince < 48) {
        setDismissed(true);
      } else {
        localStorage.removeItem("aura_install_dismissed");
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    // Track sessions
    const sessions = parseInt(localStorage.getItem("aura_sessions") || "0") + 1;
    localStorage.setItem("aura_sessions", sessions.toString());

    // Show prompt after conditions: 15s active OR 2+ sessions
    if (sessions >= 2) {
      timerRef.current = setTimeout(() => setShouldShowPrompt(true), 3000);
    } else {
      timerRef.current = setTimeout(() => setShouldShowPrompt(true), 15000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(timerRef.current);
    };
  }, [isStandalone]);

  const canPrompt = !installed && !isStandalone && !dismissed && shouldShowPrompt && (!!deferredPrompt || isIOSSafari);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShouldShowPrompt(false);
    localStorage.setItem("aura_install_dismissed", Date.now().toString());
  }, []);

  return {
    canPrompt,
    isIOSSafari,
    installed,
    isStandalone,
    deferredPrompt: !!deferredPrompt,
    promptInstall,
    dismiss,
  };
}
