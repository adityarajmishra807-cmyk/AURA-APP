import { forwardRef, useEffect, useRef, useState, type ForwardedRef, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  audioUrl: string;
  mimeType?: string;
  isMine: boolean;
}

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const VoiceNotePlayer = forwardRef<HTMLDivElement, Props>(function VoiceNotePlayer(
  { audioUrl, mimeType, isMine },
  ref
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setForwardedRef(ref, rootRef.current);
    return () => setForwardedRef(ref, null as never);
  }, [ref]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setLoadError(false);
    };

    const handleTimeUpdate = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(nextDuration);
      setProgress(nextDuration > 0 ? audio.currentTime / nextDuration : 0);
    };

    const handlePause = () => setPlaying(false);
    const handlePlay = () => setPlaying(true);
    const handleEnded = () => {
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    const handleError = () => {
      setPlaying(false);
      setLoadError(true);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("loadeddata", handleLoaded);
    audio.addEventListener("durationchange", handleLoaded);
    audio.addEventListener("canplay", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("loadeddata", handleLoaded);
      audio.removeEventListener("durationchange", handleLoaded);
      audio.removeEventListener("canplay", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      return;
    }

    try {
      setLoadError(false);
      await audio.play();
    } catch (error) {
      console.error("Voice note play failed:", error);
      setLoadError(true);
    }
  };

  const handleBarClick = (e: MouseEvent<HTMLDivElement>) => {
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

  const bars = Array.from({ length: 24 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.8 + 2)));

  return (
    <div ref={rootRef} className="flex items-center gap-2.5 min-w-[200px] max-w-[260px]">
      <audio ref={audioRef} preload="metadata" playsInline className="hidden">
        <source src={audioUrl} type={mimeType} />
      </audio>

      <motion.button
        type="button"
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
        <div className="flex items-end gap-[2px] h-5 cursor-pointer" onClick={handleBarClick}>
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  filled
                    ? isMine
                      ? "bg-primary-foreground/90"
                      : "bg-primary/80"
                    : isMine
                      ? "bg-primary-foreground/25"
                      : "bg-muted-foreground/25"
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        <span className={cn("text-[10px]", isMine ? "text-primary-foreground/50" : "text-muted-foreground/60")}>
          {playing ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
        </span>

        {loadError && (
          <audio controls playsInline preload="metadata" className="mt-1 h-8 w-full max-w-[180px]">
            <source src={audioUrl} type={mimeType} />
          </audio>
        )}
      </div>
    </div>
  );
});
