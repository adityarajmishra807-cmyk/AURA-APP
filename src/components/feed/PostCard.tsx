import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FriendButton } from "./FriendButton";
import { AnimatedRatingBar } from "./AnimatedRatingBar";
import { Coins, Clock, Check, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      aurix_balance: number;
      college_id: string | null;
    };
  };
  userRating?: number | null;
  collegeName?: string;
  friendStatus?: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId?: string;
  onFriendChange?: () => void;
  onRated: () => void;
  index?: number;
}

export function PostCard({ post, userRating, collegeName, friendStatus, friendshipId, onFriendChange, onRated, index = 0 }: PostCardProps) {
  const { user, refreshProfile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(userRating !== undefined && userRating !== null);
  const [ratedValue, setRatedValue] = useState(userRating);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwnPost = user?.id === post.user_id;

  // Per-element scroll depth shadow
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  // Shadow intensifies as card enters viewport center, then fades
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.03, 0.18, 0.18, 0.03]);
  const shadowBlur = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [8, 28, 28, 8]);
  const shadowSpread = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [-4, -2, -2, -4]);
  const boxShadow = useMotionTemplate`0 4px ${shadowBlur}px ${shadowSpread}px hsl(265 80% 65% / ${shadowOpacity})`;

  // Subtle scroll-lag: card trails behind scroll by ~5% (8px max offset)
  const lagY = useTransform(scrollYProgress, [0, 0.5, 1], [6, 0, -6]);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      onRated();
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  // Rating logic is now handled inline by AnimatedRatingBar's onCommit

  return (
    <motion.div
      ref={cardRef}
      className="glass-card rounded-2xl p-4 md:p-6 will-change-transform"
      style={{ boxShadow, y: lagY }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
        <Link to={`/profile/${post.profiles.username}`}>
          <Avatar className="w-9 h-9 md:w-10 md:h-10 border border-border tap-scale">
            <AvatarImage src={post.profiles.avatar_url || ""} />
            <AvatarFallback className="bg-muted font-display font-bold text-xs md:text-sm">
              {post.profiles.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 mr-1">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Link to={`/profile/${post.profiles.username}`} className="text-sm font-semibold text-foreground tap-scale">@{post.profiles.username}</Link>
            <div className="flex items-center gap-0.5">
              <Coins className="w-3 h-3 text-aura-gold" />
              <span className="text-[10px] md:text-xs font-medium text-aura-gold">
                {post.profiles.aurix_balance.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
            {collegeName && <span className="truncate max-w-[100px] md:max-w-none">{collegeName}</span>}
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        {!isOwnPost && friendStatus && onFriendChange && (
          <FriendButton
            targetUserId={post.user_id}
            friendStatus={friendStatus}
            friendshipId={friendshipId}
            onStatusChange={onFriendChange}
          />
        )}
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <p className="text-sm md:text-base text-foreground leading-relaxed mb-3 md:mb-4">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="mb-3 md:mb-4 rounded-xl overflow-hidden border border-border/30">
          <img src={post.image_url} alt="Post" className="w-full max-h-72 md:max-h-96 object-cover" loading="lazy" />
        </div>
      )}

      {/* Rating section */}
      {!isOwnPost && !hasRated && (
        <motion.div
          className="border-t border-border/30 pt-3 md:pt-4 mt-3 md:mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatedRatingBar
            value={ratingValue}
            onChange={(v) => setRatingValue(v)}
            onCommit={async (v) => {
              if (v === 0) {
                toast.error("Choose a non-zero rating");
                return;
              }
              setSubmitting(true);
              const { data, error } = await supabase.rpc("submit_rating", {
                p_post_id: post.id,
                p_value: v,
              });
              const result = data as any;
              if (error || !result?.success) {
                toast.error(result?.error || "Failed to submit rating");
                setSubmitting(false);
                return;
              }
              setRatedValue(v);
              setHasRated(true);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 2000);
              await refreshProfile();
              onRated();
              toast.success(
                v > 0
                  ? `+${v} AURIX sent to @${post.profiles.username}`
                  : `${v} AURIX to @${post.profiles.username}`
              );
              setSubmitting(false);
            }}
            disabled={submitting}
          />
        </motion.div>
      )}

      {/* Rated indicator */}
      <AnimatePresence>
        {hasRated && !isOwnPost && (
          <motion.div
            className="border-t border-border/30 pt-2.5 md:pt-3 mt-3 md:mt-4 flex items-center gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
            >
              <Check className="w-4 h-4 text-aura-mint" />
            </motion.div>
            <span className="text-xs text-muted-foreground">
              You rated this {ratedValue !== undefined && ratedValue !== null ? (ratedValue > 0 ? `+${ratedValue}` : ratedValue) : ""} AURIX
            </span>
            {showSuccess && (
              <motion.span
                className="text-xs text-aura-mint font-medium ml-auto"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                ✓ Sent!
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isOwnPost && (
        <div className="border-t border-border/30 pt-2.5 md:pt-3 mt-3 md:mt-4">
          <span className="text-xs text-muted-foreground">Your post</span>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post and all its ratings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
