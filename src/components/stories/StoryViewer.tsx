import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Eye, Heart, Flame, Zap, Star } from "lucide-react";
import { StoryGroup } from "@/hooks/useStories";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const STORY_DURATION = 6000; // 6 seconds per story

const REACTIONS = [
  { type: "fire", icon: Flame, label: "🔥" },
  { type: "heart", icon: Heart, label: "❤️" },
  { type: "zap", icon: Zap, label: "⚡" },
  { type: "star", icon: Star, label: "⭐" },
];

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  onReact: (storyId: string, reactionType: string) => void;
  viewedStoryIds: Set<string>;
}

export function StoryViewer({ groups, initialGroupIndex, onClose, onViewed, onReact, viewedStoryIds }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [reacted, setReacted] = useState<string | null>(null);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Fetch view count for current story
  useEffect(() => {
    if (!currentStory) return;
    supabase
      .from("story_views")
      .select("id", { count: "exact", head: true })
      .eq("story_id", currentStory.id)
      .then(({ count }) => setViewCount(count || 0));
  }, [currentStory?.id]);

  // Mark as viewed
  useEffect(() => {
    if (currentStory) onViewed(currentStory.id);
  }, [currentStory?.id]);

  // Progress timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    const remaining = STORY_DURATION - elapsedRef.current;

    timerRef.current = window.setTimeout(() => {
      goNext();
    }, remaining);

    // Animate progress
    const animate = () => {
      if (paused) return;
      const now = Date.now();
      const total = elapsedRef.current + (now - startTimeRef.current);
      setProgress(Math.min(total / STORY_DURATION, 1));
      if (total < STORY_DURATION) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [paused, groupIndex, storyIndex]);

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setReacted(null);
    if (!paused) startTimer();
    return () => clearTimeout(timerRef.current);
  }, [groupIndex, storyIndex]);

  useEffect(() => {
    if (paused) {
      elapsedRef.current += Date.now() - startTimeRef.current;
      clearTimeout(timerRef.current);
    } else {
      startTimer();
    }
    return () => clearTimeout(timerRef.current);
  }, [paused]);

  const goNext = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  }, [storyIndex, groupIndex, groups]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleReact = (type: string) => {
    if (!currentStory) return;
    setReacted(type);
    onReact(currentStory.id, type);
  };

  // Handle swipe down to close
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 100) onClose();
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-[#0B0B1F] flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Story content area */}
      <div
        className="relative w-full h-full max-w-md mx-auto flex flex-col"
        onClick={handleTap}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={(e) => { setPaused(true); handleTouchStart(e); }}
        onTouchEnd={(e) => { setPaused(false); handleTouchEnd(e); }}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3 safe-top">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white/90 rounded-full transition-none"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 safe-top">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 border border-white/20">
              <AvatarImage src={currentGroup.avatar_url || ""} />
              <AvatarFallback className="bg-white/10 text-white text-sm font-bold">
                {currentGroup.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{currentGroup.username}</p>
              <p className="text-white/50 text-[10px]">
                {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{viewCount}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {currentStory.media_type === "video" ? (
            <video
              key={currentStory.id}
              src={currentStory.media_url}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              key={currentStory.id}
              src={currentStory.media_url}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
            <p className="text-white/90 text-sm font-medium text-center leading-relaxed drop-shadow-lg">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Reactions */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-4 px-6 safe-bottom">
          {REACTIONS.map((r) => (
            <motion.button
              key={r.type}
              whileTap={{ scale: 1.3 }}
              onClick={(e) => { e.stopPropagation(); handleReact(r.type); }}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all",
                reacted === r.type
                  ? "bg-primary/30 border-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <span className="text-lg">{r.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Nav arrows (desktop) */}
        {groupIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {groupIndex < groups.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
