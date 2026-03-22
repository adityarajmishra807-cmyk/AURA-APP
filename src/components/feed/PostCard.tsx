import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FriendButton } from "./FriendButton";
import { AnimatedRatingBar } from "./AnimatedRatingBar";
import { Coins, Clock, Check, Trash2, MoreVertical, Share2, Flag, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HashtagRenderer } from "./HashtagRenderer";
import { MediaCarousel } from "./MediaCarousel";
import { SharePostDialog } from "./SharePostDialog";
import { CommentSection } from "./CommentSection";
import { PostLikeButton } from "./PostLikeButton";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { useCosmetics } from "@/hooks/useCosmetics";
import { formatDistanceToNow } from "date-fns";
import { use3DTilt } from "@/hooks/use3DTilt";
import { useIsMobile } from "@/hooks/use-mobile";
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
    media?: { media_url: string; media_type: string; position: number }[];
  };
  userRating?: number | null;
  collegeName?: string;
  friendStatus?: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId?: string;
  onFriendChange?: () => void;
  onRated: () => void;
  onHashtagClick?: (hashtag: string) => void;
  index?: number;
  likeCount?: number;
  userLiked?: boolean;
  trendingRank?: number;
}

export function PostCard({ post, userRating, collegeName, friendStatus, friendshipId, onFriendChange, onRated, onHashtagClick, index = 0, likeCount = 0, userLiked = false, trendingRank }: PostCardProps) {
  const { user, refreshProfile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [ratingValue, setRatingValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(userRating !== undefined && userRating !== null);
  const [ratedValue, setRatedValue] = useState(userRating);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const isOwnPost = user?.id === post.user_id;
  const { cosmetics } = useCosmetics(post.user_id);
  // 3D tilt — disabled on mobile for performance
  const tilt = use3DTilt({ maxTilt: isMobile ? 0 : 6, scale: isMobile ? 1 : 1.015, speed: 350 });

  // Per-element scroll depth shadow
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const shadowOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.03, 0.18, 0.18, 0.03]);
  const shadowBlur = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [8, 28, 28, 8]);
  const shadowSpread = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [-4, -2, -2, -4]);
  const boxShadow = useMotionTemplate`0 4px ${shadowBlur}px ${shadowSpread}px hsl(265 80% 65% / ${shadowOpacity})`;

  const lagY = useTransform(scrollYProgress, [0, 0.5, 1], [6, 0, -6]);

  // Parallax depth for post images — image shifts opposite to scroll
  const imageParallaxY = useTransform(scrollYProgress, [0, 1], [isMobile ? 15 : 30, isMobile ? -15 : -30]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.12, 1.08]);

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

  const handleSaveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("posts")
      .update({ content: editContent.trim() })
      .eq("id", post.id);
    if (error) {
      toast.error("Failed to update post");
    } else {
      toast.success("Post updated ✏️");
      post.content = editContent.trim();
      setIsEditing(false);
      onRated(); // refresh feed
    }
    setSaving(false);
  };

  return (
    <motion.div
      ref={(node) => {
        // Merge refs
        (cardRef as any).current = node;
        (tilt.ref as any).current = node;
      }}
      className="glass-card rounded-2xl p-4 md:p-6 will-change-transform relative overflow-hidden group/card"
      style={{
        boxShadow,
        y: lagY,
        ...tilt.style,
      }}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 350, damping: 30, delay: index * 0.04 }}
      {...tilt.handlers}
    >
      {/* Glare overlay — desktop only */}
      {!isMobile && (
        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), hsl(var(--primary) / 0.06) 0%, transparent 60%)`,
            ...(tilt.isHovering ? {} : {}),
          }}
        />
      )}

      {/* Shimmer border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none z-[1]">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, transparent 40%, transparent 60%, hsl(var(--aura-rose) / 0.1) 100%)`,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "xor",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />
      </div>

      {/* Content — above glare */}
      <div className="relative z-[2]">
        {/* Header */}
        <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
          <Link to={`/profile/${post.profiles.username}`}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Avatar className={cn("w-9 h-9 md:w-10 md:h-10 border border-border tap-scale", cosmetics.frame)}>
                <AvatarImage src={post.profiles.avatar_url || ""} />
                <AvatarFallback className="bg-muted font-display font-bold text-xs md:text-sm">
                  {post.profiles.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          </Link>
          <div className="flex-1 min-w-0 mr-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Link to={`/profile/${post.profiles.username}`} className={cn("text-sm font-semibold tap-scale", cosmetics.nameColor || "text-foreground")}>@{post.profiles.username}</Link>
              {cosmetics.badge && <span className="text-sm">{cosmetics.badge}</span>}
              <motion.div
                className="flex items-center gap-0.5"
                whileHover={{ scale: 1.1, y: -1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Coins className="w-3 h-3 text-aura-gold" />
                <span className="text-[10px] md:text-xs font-medium text-aura-gold">
                  {post.profiles.aurix_balance.toLocaleString()}
                </span>
              </motion.div>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwnPost && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditContent(post.content);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit post
                </DropdownMenuItem>
              )}
              {isOwnPost && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete post
                </DropdownMenuItem>
              )}
              {!isOwnPost && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowReportDialog(true)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Trending rank badge */}
        {trendingRank && trendingRank <= 3 && (
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-2",
            trendingRank === 1 && "bg-yellow-500/20 text-yellow-400",
            trendingRank === 2 && "bg-gray-400/20 text-gray-300",
            trendingRank === 3 && "bg-orange-500/20 text-orange-400"
          )}>
            🔥 #{trendingRank} Trending
          </div>
        )}

        {/* Content with hashtag support or edit mode */}
        {isEditing ? (
          <div className="mb-3 md:mb-4 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={500}
              className="bg-muted/30 border-border/30 focus:border-primary resize-none text-sm min-h-[60px]"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-muted-foreground mr-auto">{editContent.length}/500</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={saving}
                className="gradient-primary text-primary-foreground glow-sm"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-sm md:text-base text-foreground leading-relaxed mb-3 md:mb-4">
              <HashtagRenderer content={post.content} onHashtagClick={onHashtagClick} />
            </p>
          )
        )}

        {/* Media display */}
        {post.media && post.media.length > 0 ? (
          <MediaCarousel items={post.media} />
        ) : post.image_url && (
          <motion.div
            className="mb-3 md:mb-4 rounded-xl overflow-hidden border border-border/30 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {!imageLoaded && (
              <div className="w-full h-48 md:h-64 shimmer rounded-xl" />
            )}
            <motion.img
              src={post.image_url}
              alt="Post"
              className={cn(
                "w-full max-h-72 md:max-h-96 object-cover will-change-transform",
                !imageLoaded && "opacity-0 absolute inset-0"
              )}
              style={{ y: imageParallaxY, scale: imageScale }}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-[1]"
              style={{
                background: "linear-gradient(to top, hsl(var(--card) / 0.6), transparent)",
              }}
            />
          </motion.div>
        )}

        {/* Like + Share buttons */}
        <div className="flex items-center gap-3 mt-1 mb-1">
          <PostLikeButton postId={post.id} initialLiked={userLiked} initialCount={likeCount} />
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors tap-scale"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">Share</span>
          </button>
        </div>

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

        {/* Comments */}
        <CommentSection postId={post.id} />
      </div>

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

      {/* Share dialog */}
      <SharePostDialog postId={post.id} open={showShareDialog} onOpenChange={setShowShareDialog} />

      {/* Report dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="post"
        contentId={post.id}
        reportedUserId={post.user_id}
      />

    </motion.div>
  );
}
