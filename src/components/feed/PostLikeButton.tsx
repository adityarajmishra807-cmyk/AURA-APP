import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RatingParticles } from "./RatingParticles";

interface PostLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function PostLikeButton({ postId, initialLiked, initialCount }: PostLikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const sparkleKey = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleParticlesDone = useCallback(() => setShowParticles(false), []);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const toggle = async () => {
    if (!user) return;

    const wasLiked = liked;
    const prevCount = count;
    setLiked(!wasLiked);
    setCount(wasLiked ? prevCount - 1 : prevCount + 1);

    if (!wasLiked) {
      sparkleKey.current += 1;
      setShowSparkle(true);
      setShowParticles(true);
      setTimeout(() => setShowSparkle(false), 600);
    }

    if (wasLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
        toast.error("Failed to unspark");
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        );
      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
        toast.error("Failed to spark");
      }
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      className="flex items-center gap-1.5 group/like tap-scale relative"
      aria-label={liked ? "Unspark" : "Spark"}
    >
      <motion.div
        whileTap={{ scale: 0.75 }}
        animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className="relative"
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            liked
              ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]"
              : "text-muted-foreground group-hover/like:text-yellow-400"
          }`}
        />
        <AnimatePresence>
          {showSparkle && (
            <motion.div
              key={sparkleKey.current}
              className="absolute -top-1.5 -right-1.5"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            </motion.div>
          )}
        </AnimatePresence>
        <RatingParticles
          active={showParticles}
          color="#facc15"
          x={10}
          y={10}
          count={8}
          onComplete={handleParticlesDone}
        />
      </motion.div>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className={`text-xs font-medium tabular-nums ${
            liked ? "text-yellow-400" : "text-muted-foreground"
          }`}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
