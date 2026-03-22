import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  // Fetch count on mount
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);
      setCommentCount(count || 0);
    };
    fetchCount();
  }, [postId]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      // Fetch profiles for comment authors
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      setComments(data.map((c: any) => ({ ...c, profiles: profileMap[c.user_id] })));
      setCommentCount(data.length);
    }
    setLoading(false);
  }, [postId]);

  // Subscribe to realtime when expanded
  useEffect(() => {
    if (!expanded) return;
    fetchComments();

    channelRef.current = supabase
      .channel(`comments-${postId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `post_id=eq.${postId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [expanded, postId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    if (newComment.length > 300) {
      toast.error("Comment must be 300 characters or less");
      return;
    }
    const profanityError = validateContent(newComment);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) toast.error("Failed to delete comment");
  };

  return (
    <div className="border-t border-border/30 mt-3 md:mt-4 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors tap-scale"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {commentCount} {commentCount === 1 ? "comment" : "comments"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto">
              {loading && comments.length === 0 && (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  className="flex gap-2 group"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link to={`/profile/${comment.profiles?.username}`}>
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {comment.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <Link to={`/profile/${comment.profiles?.username}`} className="text-xs font-semibold text-foreground hover:underline">
                        @{comment.profiles?.username}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 break-words">{comment.content}</p>
                  </div>
                  {comment.user_id === user?.id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={300}
                className="h-8 text-xs"
                disabled={submitting}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
