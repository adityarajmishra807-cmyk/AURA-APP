import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useWebRTC, CallType } from "@/hooks/useWebRTC";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  callType: "voice" | "video";
  otherUser: any;
}

export function CallModal({ open, onClose, callType, otherUser }: Props) {
  const {
    callState,
    duration,
    micMuted,
    videoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    endCall,
    toggleMic,
    toggleVideo,
  } = useWebRTC();

  // Initiate call when modal opens
  useEffect(() => {
    if (!open || !otherUser?.user_id) return;
    const type: CallType = callType === "video" ? "video" : "audio";
    startCall(otherUser.user_id, type).catch((err) => {
      toast.error(err?.message === "Permission denied" ? "Camera/mic access denied" : "Failed to start call");
      onClose();
    });
  }, [open, otherUser?.user_id]);

  const handleHangUp = () => {
    endCall();
    onClose();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const status = callState.status;
  const isVideo = callType === "video";

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
          <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />

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
            {/* Video section */}
            {isVideo && (
              <div className="relative h-64 bg-muted/30 flex items-center justify-center overflow-hidden">
                {/* Remote video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover",
                    status !== "connected" && "hidden"
                  )}
                />
                {status !== "connected" && (
                  <div className="text-muted-foreground/40 text-xs text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/40 mx-auto mb-2 flex items-center justify-center">
                      <Video className="w-7 h-7 opacity-40" />
                    </div>
                    {status === "ringing" ? "Calling…" : "Connecting…"}
                  </div>
                )}
                {/* Self preview PIP */}
                <div className="absolute bottom-3 right-3 w-20 h-28 rounded-xl bg-muted/50 border border-border/30 overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn("w-full h-full object-cover", videoOff && "hidden")}
                  />
                  {videoOff && (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[10px] text-muted-foreground">Camera off</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio-only: hidden video element for local stream */}
            {!isVideo && (
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
            )}
            {/* Hidden remote audio element */}
            <video ref={remoteVideoRef} autoPlay playsInline className={cn(!isVideo && "hidden")} />
            {/* For audio calls, use a separate audio element */}
            {!isVideo && (
              <audio
                ref={(el) => {
                  if (el && remoteVideoRef.current) {
                    // Share the srcObject from the remoteVideoRef
                    const interval = setInterval(() => {
                      if (remoteVideoRef.current?.srcObject) {
                        el.srcObject = remoteVideoRef.current.srcObject;
                        clearInterval(interval);
                      }
                    }, 200);
                    setTimeout(() => clearInterval(interval), 10000);
                  }
                }}
                autoPlay
              />
            )}

            {/* Info section */}
            <div className={cn("flex flex-col items-center px-6 pb-6", isVideo ? "pt-4" : "pt-10")}>
              {!isVideo && (
                <motion.div
                  animate={status === "connected" ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 relative"
                >
                  <div className={cn(
                    "rounded-full p-1",
                    status === "connected"
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
                  {/* Ripple for ringing */}
                  {status === "ringing" && (
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
                {status === "ringing" && (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    {isVideo ? "Video calling…" : "Calling…"}
                  </motion.span>
                )}
                {status === "connecting" && (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    Connecting…
                  </motion.span>
                )}
                {status === "connected" && (
                  <span className="text-aura-mint font-medium">{formatDuration(duration)}</span>
                )}
                {(status === "ended" || status === "rejected" || status === "missed") && (
                  <span className="text-muted-foreground">
                    {status === "rejected" ? "Call declined" : status === "missed" ? "No answer" : "Call ended"}
                  </span>
                )}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-4 mt-8">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                    micMuted
                      ? "bg-destructive/20 border border-destructive/40 text-destructive"
                      : "bg-secondary/60 border border-border/30 text-foreground hover:bg-secondary"
                  )}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleHangUp}
                  className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_20px_hsl(var(--destructive)/0.4)] hover:bg-destructive/90 transition-colors"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </motion.button>

                {isVideo ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleVideo}
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
                  <div className="w-14 h-14" /> // spacer for audio
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
