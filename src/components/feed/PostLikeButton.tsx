import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PostLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function PostLikeButton({ postId, initialLiked, initialCount }: PostLikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const toggle = async () => {
    if (!user) return;

    // Optimistic update
    const wasLiked = liked;
    const prevCount = count;
    setLiked(!wasLiked);
    setCount(wasLiked ? prevCount - 1 : prevCount + 1);

    if (wasLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
        toast.error("Failed to unlike");
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });
      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
        toast.error("Failed to like");
      }
    }
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 group/like tap-scale"
      aria-label={liked ? "Unlike" : "Like"}
    >
      <motion.div
        whileTap={{ scale: 0.75 }}
        animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            liked
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground group-hover/like:text-red-400"
          }`}
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
            liked ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
