import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Coins, Clock, Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
  onRated: () => void;
}

export function PostCard({ post, userRating, collegeName, onRated }: PostCardProps) {
  const { user, refreshProfile } = useAuth();
  const [ratingValue, setRatingValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(userRating !== undefined && userRating !== null);
  const isOwnPost = user?.id === post.user_id;

  const handleRate = async () => {
    if (ratingValue === 0) {
      toast.error("Choose a non-zero rating");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_rating", {
      p_post_id: post.id,
      p_value: ratingValue,
    });

    const result = data as any;
    if (error || !result?.success) {
      toast.error(result?.error || "Failed to submit rating");
      setSubmitting(false);
      return;
    }

    setHasRated(true);
    await refreshProfile();
    onRated();
    toast.success(
      ratingValue > 0
        ? `+${ratingValue} AURIX sent to @${post.profiles.username}`
        : `${ratingValue} AURIX to @${post.profiles.username}`
    );
    setSubmitting(false);
  };

  const getRatingColor = (value: number) => {
    if (value > 0) return "text-aura-mint";
    if (value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10 border border-border">
          <AvatarImage src={post.profiles.avatar_url || ""} />
          <AvatarFallback className="bg-muted font-display font-bold text-sm">
            {post.profiles.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              @{post.profiles.username}
            </span>
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-aura-gold" />
              <span className="text-xs font-medium text-aura-gold">
                {post.profiles.aurix_balance.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {collegeName && <span>{collegeName}</span>}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed mb-4">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="mb-4 rounded-xl overflow-hidden border border-border/30">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full max-h-96 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Rating section */}
      {!isOwnPost && !hasRated && (
        <div className="border-t border-border/30 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rate this post
            </span>
            <span className={cn("font-display text-xl font-bold", getRatingColor(ratingValue))}>
              {ratingValue > 0 ? `+${ratingValue}` : ratingValue}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-destructive">
              <Minus className="w-3 h-3" />
              <span>10</span>
            </div>
            <Slider
              value={[ratingValue]}
              onValueChange={([v]) => setRatingValue(v)}
              min={-10}
              max={10}
              step={1}
              className="flex-1"
            />
            <div className="flex items-center gap-1 text-xs text-aura-mint">
              <Plus className="w-3 h-3" />
              <span>10</span>
            </div>
          </div>

          <Button
            onClick={handleRate}
            disabled={submitting || ratingValue === 0}
            size="sm"
            className="w-full mt-3 gradient-primary text-primary-foreground glow-sm"
          >
            {submitting ? "Rating..." : `Send ${ratingValue > 0 ? "+" : ""}${ratingValue} AURIX`}
          </Button>
        </div>
      )}

      {/* Already rated indicator */}
      {hasRated && !isOwnPost && (
        <div className="border-t border-border/30 pt-3 mt-4 flex items-center gap-2 text-muted-foreground">
          <Check className="w-4 h-4 text-aura-mint" />
          <span className="text-xs">
            You rated this {userRating !== undefined && userRating !== null ? (userRating > 0 ? `+${userRating}` : userRating) : ""} AURIX
          </span>
        </div>
      )}

      {isOwnPost && (
        <div className="border-t border-border/30 pt-3 mt-4">
          <span className="text-xs text-muted-foreground">Your post</span>
        </div>
      )}
    </div>
  );
}
