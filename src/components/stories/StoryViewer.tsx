import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Eye, Heart, Flame, Zap, Star, Trash2 } from "lucide-react";
import { StoryGroup } from "@/hooks/useStories";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORY_DURATION = 6000;

const REACTIONS = [
  { type: "fire", icon: Flame, label: "🔥" },
  { type: "heart", icon: Heart, label: "❤️" },
  { type: "zap", icon: Zap, label: "⚡" },
  { type: "star", icon: Star, label: "⭐" },
];

interface ReactionCounts {
  [key: string]: number;
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  onReact: (storyId: string, reactionType: string) => void;
  onDelete?: (storyId: string) => Promise<boolean>;
  viewedStoryIds: Set<string>;
}

export function StoryViewer({ groups, initialGroupIndex, onClose, onViewed, onReact, onDelete, viewedStoryIds }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [reacted, setReacted] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [storyRating, setStoryRating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = user && currentGroup?.user_id === user.id;

  // Fetch view count + reaction counts + existing rating for current story
  useEffect(() => {
    if (!currentStory) return;

    // View count
    supabase
      .from("story_views")
      .select("id", { count: "exact", head: true })
      .eq("story_id", currentStory.id)
      .then(({ count }) => setViewCount(count || 0));

    // Reaction counts
    supabase
      .from("story_reactions")
      .select("reaction_type")
      .eq("story_id", currentStory.id)
      .then(({ data }) => {
        const counts: ReactionCounts = {};
        data?.forEach((r: any) => {
          counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        });
        setReactionCounts(counts);
      });

    // Check if user already rated this story
    if (user) {
      supabase
        .from("story_ratings")
        .select("value")
        .eq("story_id", currentStory.id)
        .eq("rater_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setStoryRating(data.value);
            setHasRated(true);
          } else {
            setStoryRating(null);
            setHasRated(false);
          }
        });
    }
  }, [currentStory?.id, user]);

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
    setReactionCounts((prev) => ({
      ...prev,
      [type]: (prev[type] || 0) + 1,
    }));
  };

  const handleStoryRating = async (value: number) => {
    if (!currentStory || !user || hasRated || ratingSubmitting || isOwnStory) return;
    setRatingSubmitting(true);
    setPaused(true);

    const { data } = await supabase.rpc("submit_story_rating", {
      p_story_id: currentStory.id,
      p_value: value,
    });

    setRatingSubmitting(false);
    setPaused(false);

    if (data && typeof data === "object" && "success" in data) {
      const result = data as { success: boolean; error?: string; value?: number };
      if (result.success) {
        setStoryRating(value);
        setHasRated(true);
        toast.success(`Rated ${value > 0 ? "+" : ""}${value} AURIX`);
      } else {
        toast.error(result.error || "Failed to rate");
      }
    }
  };

  const handleDelete = async () => {
    if (!currentStory || !onDelete || deleting) return;
    setDeleting(true);
    setPaused(true);
    const success = await onDelete(currentStory.id);
    setDeleting(false);
    if (success) {
      toast.success("Story deleted");
      // If this was the last story in the group, close or go to next group
      if (currentGroup.stories.length <= 1) {
        if (groupIndex < groups.length - 1) {
          setGroupIndex((i) => i + 1);
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        goNext();
      }
    } else {
      setPaused(false);
    }
  };


  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 100) onClose();
  };

  if (!currentStory) return null;

  const ratingValues = [-5, -3, -1, 1, 3, 5];

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

        {/* Public reaction counts */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5 safe-top">
            {REACTIONS.filter((r) => reactionCounts[r.type]).map((r) => (
              <div key={r.type} className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5">
                <span className="text-xs">{r.label}</span>
                <span className="text-[10px] text-white/70 font-medium">{reactionCounts[r.type]}</span>
              </div>
            ))}
          </div>
        )}

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
          <div className="absolute bottom-36 left-0 right-0 z-20 px-6">
            <p className="text-white/90 text-sm font-medium text-center leading-relaxed drop-shadow-lg">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* AURIX Rating bar (only for other people's stories) */}
        {!isOwnStory && (
          <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4">
            {hasRated ? (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
                <span className="text-[10px] text-white/50">Rated</span>
                <span className={cn(
                  "text-xs font-bold",
                  storyRating && storyRating > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {storyRating && storyRating > 0 ? "+" : ""}{storyRating} AURIX
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {ratingValues.map((v) => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 1.2 }}
                    disabled={ratingSubmitting}
                    onClick={(e) => { e.stopPropagation(); handleStoryRating(v); }}
                    className={cn(
                      "h-8 min-w-[36px] rounded-full flex items-center justify-center text-[11px] font-bold backdrop-blur-md border transition-all",
                      v > 0
                        ? "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                        : "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30",
                      ratingSubmitting && "opacity-50"
                    )}
                  >
                    {v > 0 ? "+" : ""}{v}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        <div className="absolute bottom-14 left-0 right-0 z-20 flex justify-center gap-4 px-6 safe-bottom">
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
