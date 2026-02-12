import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PostWithProfile {
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
}

export function PostFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [colleges, setColleges] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  const channelRef = useRef<any>(null);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url, aurix_balance, college_id)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const mapped = data.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      }));
      setPosts(mapped);
      setNewPostCount(0);
    }
    setLoading(false);
  }, []);

  const fetchUserRatings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ratings")
      .select("post_id, value")
      .eq("rater_id", user.id);

    if (data) {
      const map: Record<string, number> = {};
      data.forEach((r: any) => { map[r.post_id] = r.value; });
      setUserRatings(map);
    }
  }, [user]);

  const fetchColleges = useCallback(async () => {
    const { data } = await supabase.from("colleges").select("id, name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((c: any) => { map[c.id] = c.name; });
      setColleges(map);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    fetchPosts();
    fetchUserRatings();
    fetchColleges();

    channelRef.current = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          // If it's from the current user, auto-refresh
          if (payload.new.user_id === user?.id) {
            fetchPosts();
          } else {
            setNewPostCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchPosts, fetchUserRatings, fetchColleges, user]);

  const handleRefresh = () => {
    fetchPosts();
    fetchUserRatings();
  };

  const handleLoadNew = () => {
    fetchPosts();
    fetchUserRatings();
    toast.success("Feed updated!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-2 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="h-4 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CreatePostForm onPostCreated={handleRefresh} />
      </motion.div>

      {/* New posts indicator */}
      <AnimatePresence>
        {newPostCount > 0 && (
          <motion.button
            className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            onClick={handleLoadNew}
          >
            <RefreshCw className="w-4 h-4" />
            {newPostCount} new {newPostCount === 1 ? "post" : "posts"} — tap to refresh
          </motion.button>
        )}
      </AnimatePresence>

      {posts.length === 0 ? (
        <motion.div
          className="glass-card rounded-2xl p-12 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground">Be the first to post and earn +10 AURIX!</p>
        </motion.div>
      ) : (
        posts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            userRating={userRatings[post.id] ?? null}
            collegeName={post.profiles.college_id ? colleges[post.profiles.college_id] : undefined}
            onRated={handleRefresh}
            index={i}
          />
        ))
      )}
    </div>
  );
}
