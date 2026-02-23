import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWebRTC } from "@/hooks/useWebRTC";
import { toast } from "sonner";

interface Props {
  call: {
    id: string;
    caller_id: string;
    type: "audio" | "video";
    caller_username?: string;
    caller_avatar?: string;
  };
  onDismiss: () => void;
}

export function IncomingCallModal({ call, onDismiss }: Props) {
  const {
    callState,
    duration,
    micMuted,
    videoOff,
    localVideoRef,
    remoteVideoRef,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleVideo,
  } = useWebRTC();

  const [accepted, setAccepted] = useState(false);
  const isVideo = call.type === "video";

  const handleAccept = async () => {
    try {
      setAccepted(true);
      await acceptCall(call.id, call.type);
    } catch {
      toast.error("Failed to connect call");
      onDismiss();
    }
  };

  const handleReject = async () => {
    await rejectCall(call.id);
    onDismiss();
  };

  const handleHangUp = () => {
    endCall();
    onDismiss();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const status = callState.status;

  // If not yet accepted, show ringing UI
  if (!accepted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />

        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative z-10 w-full max-w-xs mx-4 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/30 shadow-2xl p-6"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              className="mb-4 relative"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="ring-2 ring-primary/40 rounded-full p-1">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={call.caller_avatar || ""} />
                  <AvatarFallback className="bg-muted font-display font-bold text-xl">
                    {call.caller_username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              {/* Ripple */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-primary/20"
                  animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.4, 0] }}
                  transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                />
              ))}
            </motion.div>

            <h2 className="text-lg font-semibold text-foreground">{call.caller_username || "Unknown"}</h2>
            <motion.p
              className="text-sm text-muted-foreground mt-1"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Incoming {isVideo ? "video" : "voice"} call…
            </motion.p>

            <div className="flex items-center gap-6 mt-8">
              {/* Reject */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleReject}
                className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_20px_hsl(var(--destructive)/0.4)]"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>

              {/* Accept */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleAccept}
                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
              >
                {isVideo ? <Video className="w-6 h-6 text-primary-foreground" /> : <Phone className="w-6 h-6 text-primary-foreground" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Active call UI (after accepting)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />

      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative z-10 w-full max-w-sm mx-4 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/30 shadow-2xl overflow-hidden"
      >
        {isVideo && (
          <div className="relative h-64 bg-muted/30 overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${status !== "connected" ? "hidden" : ""}`}
            />
            {status !== "connected" && (
              <div className="flex items-center justify-center h-full text-muted-foreground/40 text-xs">
                Connecting…
              </div>
            )}
            <div className="absolute bottom-3 right-3 w-20 h-28 rounded-xl bg-muted/50 border border-border/30 overflow-hidden">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {!isVideo && <video ref={localVideoRef} className="hidden" />}
        {!isVideo && <video ref={remoteVideoRef} className="hidden" />}
        {!isVideo && (
          <audio
            ref={(el) => {
              if (el && remoteVideoRef.current) {
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

        <div className={`flex flex-col items-center px-6 pb-6 ${isVideo ? "pt-4" : "pt-10"}`}>
          {!isVideo && (
            <div className="mb-4">
              <Avatar className="w-24 h-24 ring-2 ring-primary/30">
                <AvatarImage src={call.caller_avatar || ""} />
                <AvatarFallback className="bg-muted font-display font-bold text-2xl">
                  {call.caller_username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <h2 className="text-lg font-semibold text-foreground">{call.caller_username || "Unknown"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "connected" ? (
              <span className="text-aura-mint font-medium">{formatDuration(duration)}</span>
            ) : (
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                Connecting…
              </motion.span>
            )}
          </p>

          <div className="flex items-center gap-4 mt-8">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                micMuted ? "bg-destructive/20 border border-destructive/40 text-destructive" : "bg-secondary/60 border border-border/30 text-foreground"
              }`}
            >
              {micMuted ? <Phone className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleHangUp}
              className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_20px_hsl(var(--destructive)/0.4)]"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.button>

            {isVideo ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  videoOff ? "bg-destructive/20 border border-destructive/40 text-destructive" : "bg-secondary/60 border border-border/30 text-foreground"
                }`}
              >
                <Video className="w-5 h-5" />
              </motion.button>
            ) : (
              <div className="w-14 h-14" />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
