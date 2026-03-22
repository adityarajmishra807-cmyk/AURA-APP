import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  audioUrl: string;
  mimeType?: string;
  isMine: boolean;
}

export function VoiceNotePlayer({ audioUrl, mimeType, isMine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number>();

  const initAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.src = audioUrl;
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setReady(true);
    });
    audio.addEventListener("canplay", () => setReady(true));
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });
    audio.addEventListener("error", () => {
      // Try without crossOrigin
      if (audio.crossOrigin) {
        audio.crossOrigin = "";
        audio.src = audioUrl;
      }
    });
    return audio;
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setProgress(audio.currentTime / (audio.duration || 1));
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const togglePlay = async () => {
    const audio = initAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      try {
        await audio.play();
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Fallback: open in new tab
        window.open(audioUrl, "_blank");
      }
    }
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate waveform bars (decorative)
  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.8 + 2));
    return h;
  });

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] max-w-[260px]">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/15 hover:bg-primary/25"
        )}
      >
        {playing ? (
          <Pause className={cn("w-4 h-4", isMine ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <Play className={cn("w-4 h-4 ml-0.5", isMine ? "text-primary-foreground" : "text-primary")} />
        )}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform */}
        <div
          className="flex items-end gap-[2px] h-5 cursor-pointer"
          onClick={handleBarClick}
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  filled
                    ? isMine ? "bg-primary-foreground/90" : "bg-primary/80"
                    : isMine ? "bg-primary-foreground/25" : "bg-muted-foreground/25"
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        <span className={cn(
          "text-[10px]",
          isMine ? "text-primary-foreground/50" : "text-muted-foreground/60"
        )}>
          {playing ? formatTime((audioRef.current?.currentTime || 0)) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
