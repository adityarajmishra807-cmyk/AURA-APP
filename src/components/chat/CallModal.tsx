import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type CallType = "voice" | "video";
type CallState = "calling" | "connected" | "ended";

interface Props {
  open: boolean;
  onClose: () => void;
  callType: CallType;
  otherUser: any;
}

export function CallModal({ open, onClose, callType, otherUser }: Props) {
  const [callState, setCallState] = useState<CallState>("calling");
  const [duration, setDuration] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Simulate auto-connect after 3s (replace with real WebRTC/signaling)
  useEffect(() => {
    if (!open) { setCallState("calling"); setDuration(0); return; }
    const t = setTimeout(() => setCallState("connected"), 3000);
    return () => clearTimeout(t);
  }, [open]);

  // Call duration timer
  useEffect(() => {
    if (callState !== "connected") return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleHangUp = () => {
    setCallState("ended");
    setTimeout(onClose, 800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />

          {/* Ambient glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>

          {/* Call card */}
          <motion.div
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-full max-w-sm mx-4 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/30 shadow-2xl overflow-hidden"
          >
            {/* Video placeholder (top section) */}
            {callType === "video" && (
              <div className="relative h-64 bg-muted/30 flex items-center justify-center">
                {videoOff ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <VideoOff className="w-8 h-8" />
                    <span className="text-xs">Camera off</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground/40 text-xs text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/40 mx-auto mb-2 flex items-center justify-center">
                      <Video className="w-7 h-7 opacity-40" />
                    </div>
                    Video stream
                  </div>
                )}
                {/* Self preview pip */}
                <div className="absolute bottom-3 right-3 w-20 h-28 rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] text-muted-foreground">You</span>
                </div>
              </div>
            )}

            {/* Info section */}
            <div className={cn("flex flex-col items-center px-6 pb-6", callType === "video" ? "pt-4" : "pt-10")}>
              {callType === "voice" && (
                <motion.div
                  animate={callState === "connected" ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 relative"
                >
                  <div className={cn(
                    "rounded-full p-1",
                    callState === "connected"
                      ? "ring-2 ring-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                      : "ring-2 ring-border/30"
                  )}>
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={otherUser?.avatar_url || ""} />
                      <AvatarFallback className="bg-muted font-display font-bold text-2xl">
                        {otherUser?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {/* Ripple for calling state */}
                  {callState === "calling" && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 rounded-full border border-primary/20"
                          animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.4, 0] }}
                          transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              )}

              <h2 className="text-lg font-semibold text-foreground">{otherUser?.username || "..."}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {callState === "calling" && (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    {callType === "video" ? "Video calling…" : "Calling…"}
                  </motion.span>
                )}
                {callState === "connected" && (
                  <span className="text-aura-mint font-medium">{formatDuration(duration)}</span>
                )}
                {callState === "ended" && <span className="text-muted-foreground">Call ended</span>}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-4 mt-8">
                {/* Mute mic */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMicMuted((m) => !m)}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                    micMuted
                      ? "bg-destructive/20 border border-destructive/40 text-destructive"
                      : "bg-secondary/60 border border-border/30 text-foreground hover:bg-secondary"
                  )}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>

                {/* Hang up */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleHangUp}
                  className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_20px_hsl(var(--destructive)/0.4)] hover:bg-destructive/90 transition-colors"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </motion.button>

                {/* Speaker / Video toggle */}
                {callType === "video" ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setVideoOff((v) => !v)}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                      videoOff
                        ? "bg-destructive/20 border border-destructive/40 text-destructive"
                        : "bg-secondary/60 border border-border/30 text-foreground hover:bg-secondary"
                    )}
                  >
                    {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSpeakerMuted((m) => !m)}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                      speakerMuted
                        ? "bg-destructive/20 border border-destructive/40 text-destructive"
                        : "bg-secondary/60 border border-border/30 text-foreground hover:bg-secondary"
                    )}
                  >
                    {speakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
