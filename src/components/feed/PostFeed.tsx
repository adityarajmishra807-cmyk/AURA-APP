import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { PullToRefresh } from "./PullToRefresh";
import { Sparkles, RefreshCw, Users, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAchievements } from "@/hooks/useAchievements";

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

type FeedFilter = "all" | "friends" | "mine";

const PAGE_SIZE = 20;

export function PostFeed() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [colleges, setColleges] = useState<Record<string, string>>({});
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendships, setFriendships] = useState<Record<string, { status: string; id: string; direction: "sent" | "received" }>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [newPostCount, setNewPostCount] = useState(0);
  const channelRef = useRef<any>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friends")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data) {
      const ids: string[] = [];
      const map: Record<string, { status: string; id: string; direction: "sent" | "received" }> = {};
      data.forEach((f: any) => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const direction = f.requester_id === user.id ? "sent" : "received";
        map[otherId] = { status: f.status, id: f.id, direction };
        if (f.status === "accepted") ids.push(otherId);
      });
      setFriendIds(ids);
      setFriendships(map);
    }
  }, [user]);

  const fetchPosts = useCallback(async (cursor?: string) => {
    let query = supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url, aurix_balance, college_id)")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (!error && data) {
      const mapped = data.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      }));
      if (cursor) {
        setPosts((prev) => [...prev, ...mapped]);
      } else {
        setPosts(mapped);
        setNewPostCount(0);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
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

  useEffect(() => {
    fetchPosts();
    fetchUserRatings();
    fetchColleges();
    fetchFriends();

    channelRef.current = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
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
  }, [fetchPosts, fetchUserRatings, fetchColleges, fetchFriends, user]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const lastPost = posts[posts.length - 1];
          if (lastPost) {
            setLoadingMore(true);
            fetchPosts(lastPost.created_at);
          }
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, posts, fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setHasMore(true);
    await Promise.all([fetchPosts(), fetchUserRatings(), fetchFriends()]);
    checkAchievements();
  }, [fetchPosts, fetchUserRatings, fetchFriends, checkAchievements]);

  const handleLoadNew = () => {
    setHasMore(true);
    fetchPosts();
    fetchUserRatings();
    toast.success("Feed updated!");
  };

  const getFriendStatus = (userId: string): "none" | "pending_sent" | "pending_received" | "accepted" => {
    const f = friendships[userId];
    if (!f) return "none";
    if (f.status === "accepted") return "accepted";
    if (f.status === "pending" && f.direction === "sent") return "pending_sent";
    if (f.status === "pending" && f.direction === "received") return "pending_received";
    return "none";
  };

  const displayedPosts = filter === "friends"
    ? posts.filter((p) => friendIds.includes(p.user_id) || p.user_id === user?.id)
    : filter === "mine"
    ? posts.filter((p) => p.user_id === user?.id)
    : posts;

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
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CreatePostForm onPostCreated={handleRefresh} />
      </motion.div>

      {/* Feed filter */}
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
        {([
          { key: "all" as FeedFilter, label: "All", Icon: Globe },
          { key: "friends" as FeedFilter, label: "Friends", Icon: Users },
          { key: "mine" as FeedFilter, label: "My Posts", Icon: Sparkles },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors tap-scale"
          >
            {filter === tab.key && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
                layoutId="feedFilterTab"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-1.5 ${filter === tab.key ? "text-primary" : "text-muted-foreground"}`}>
              <tab.Icon className="w-3.5 h-3.5" />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

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

      {displayedPosts.length === 0 ? (
        <motion.div
          className="glass-card rounded-2xl p-12 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            {filter === "friends" ? "No friends' posts yet" : filter === "mine" ? "You haven't posted yet" : "No posts yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "friends" ? "Add friends to see their posts here!" : filter === "mine" ? "Create your first post above!" : "Be the first to post and earn +10 AURIX!"}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {displayedPosts.map((post, i) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 360, damping: 28, delay: i * 0.04 }}
            >
              <PostCard
                post={post}
                userRating={userRatings[post.id] ?? null}
                collegeName={post.profiles.college_id ? colleges[post.profiles.college_id] : undefined}
                friendStatus={getFriendStatus(post.user_id)}
                friendshipId={friendships[post.user_id]?.id}
                onFriendChange={fetchFriends}
                onRated={handleRefresh}
                index={i}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
      {!hasMore && displayedPosts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">You've reached the end ✨</p>
      )}
    </div>
    </PullToRefresh>
  );
}
