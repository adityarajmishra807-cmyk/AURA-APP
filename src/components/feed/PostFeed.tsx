import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { PullToRefresh } from "./PullToRefresh";
import { Sparkles, RefreshCw, Users, Globe, Loader2, TrendingUp, X } from "lucide-react";
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
  media?: { media_url: string; media_type: string; position: number }[];
}

type FeedFilter = "all" | "friends" | "mine" | "trending";

const PAGE_SIZE = 20;

export function PostFeed() {
  const { user } = useAuth();
  const { checkAchievements } = useAchievements();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [colleges, setColleges] = useState<Record<string, string>>({});
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendships, setFriendships] = useState<Record<string, { status: string; id: string; direction: "sent" | "received" }>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [newPostCount, setNewPostCount] = useState(0);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [trendingRanks, setTrendingRanks] = useState<Record<string, number>>({});
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

  const fetchLikes = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return;

    const { data: countData } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => {
        counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      });
      setLikeCounts((prev) => ({ ...prev, ...counts }));
    }

    if (user) {
      const { data: userLikeData } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      if (userLikeData) {
        setUserLikes((prev) => {
          const next = new Set(prev);
          userLikeData.forEach((r: any) => next.add(r.post_id));
          return next;
        });
      }
    }
  }, [user]);

  const fetchPostMedia = useCallback(async (postIds: string[]) => {
    if (!postIds.length) return {};
    const { data } = await supabase
      .from("post_media")
      .select("post_id, media_url, media_type, position")
      .in("post_id", postIds)
      .order("position", { ascending: true });

    const mediaMap: Record<string, { media_url: string; media_type: string; position: number }[]> = {};
    if (data) {
      data.forEach((m: any) => {
        if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
        mediaMap[m.post_id].push(m);
      });
    }
    return mediaMap;
  }, []);

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

      // Fetch media for these posts
      const mediaMap = await fetchPostMedia(mapped.map((p: any) => p.id));
      const withMedia = mapped.map((p: any) => ({
        ...p,
        media: mediaMap[p.id] || [],
      }));

      if (cursor) {
        setPosts((prev) => [...prev, ...withMedia]);
      } else {
        setPosts(withMedia);
        setNewPostCount(0);
      }
      setHasMore(data.length === PAGE_SIZE);
      fetchLikes(mapped.map((p: any) => p.id));
    }
    setLoading(false);
    setLoadingMore(false);
  }, [fetchLikes, fetchPostMedia]);

  const fetchTrendingPosts = useCallback(async () => {
    const { data: trendingData } = await supabase.rpc("get_trending_posts", { p_limit: 20 });
    if (!trendingData || !trendingData.length) {
      setTrendingRanks({});
      return;
    }

    const ranks: Record<string, number> = {};
    (trendingData as any[]).forEach((t, i) => {
      ranks[t.post_id] = i + 1;
    });
    setTrendingRanks(ranks);

    // Fetch full post data for trending
    const trendingIds = (trendingData as any[]).map((t) => t.post_id);
    const { data: postData } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url, aurix_balance, college_id)")
      .in("id", trendingIds);

    if (postData) {
      const mapped = postData.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      }));
      const mediaMap = await fetchPostMedia(trendingIds);
      const withMedia = mapped.map((p: any) => ({
        ...p,
        media: mediaMap[p.id] || [],
      }));
      // Sort by trending rank
      withMedia.sort((a, b) => (ranks[a.id] || 999) - (ranks[b.id] || 999));
      setPosts(withMedia);
      fetchLikes(trendingIds);
    }
    setLoading(false);
  }, [fetchLikes, fetchPostMedia]);

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
    if (filter === "trending") {
      setLoading(true);
      fetchTrendingPosts();
    } else {
      fetchPosts();
    }
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
            if (filter !== "trending") fetchPosts();
          } else {
            setNewPostCount((c) => c + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_likes" },
        (payload: any) => {
          const postId = payload.new.post_id;
          setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
          if (payload.new.user_id === user?.id) {
            setUserLikes((prev) => new Set(prev).add(postId));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_likes" },
        (payload: any) => {
          const postId = payload.old.post_id;
          setLikeCounts((prev) => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }));
          if (payload.old.user_id === user?.id) {
            setUserLikes((prev) => {
              const next = new Set(prev);
              next.delete(postId);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [filter, fetchPosts, fetchTrendingPosts, fetchUserRatings, fetchColleges, fetchFriends, user]);

  // Infinite scroll observer (disabled for trending)
  useEffect(() => {
    if (!sentinelRef.current || filter === "trending") return;
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
  }, [hasMore, loadingMore, loading, posts, fetchPosts, filter]);

  const handleRefresh = useCallback(async () => {
    setHasMore(true);
    if (filter === "trending") {
      await Promise.all([fetchTrendingPosts(), fetchUserRatings(), fetchFriends()]);
    } else {
      await Promise.all([fetchPosts(), fetchUserRatings(), fetchFriends()]);
    }
    checkAchievements();
  }, [filter, fetchPosts, fetchTrendingPosts, fetchUserRatings, fetchFriends, checkAchievements]);

  const handleLoadNew = () => {
    setHasMore(true);
    if (filter === "trending") fetchTrendingPosts();
    else fetchPosts();
    fetchUserRatings();
    toast.success("Feed updated!");
  };

  const handleHashtagClick = (hashtag: string) => {
    setActiveHashtag(hashtag);
    setFilter("all");
  };

  const getFriendStatus = (userId: string): "none" | "pending_sent" | "pending_received" | "accepted" => {
    const f = friendships[userId];
    if (!f) return "none";
    if (f.status === "accepted") return "accepted";
    if (f.status === "pending" && f.direction === "sent") return "pending_sent";
    if (f.status === "pending" && f.direction === "received") return "pending_received";
    return "none";
  };

  let displayedPosts = filter === "friends"
    ? posts.filter((p) => friendIds.includes(p.user_id) || p.user_id === user?.id)
    : filter === "mine"
    ? posts.filter((p) => p.user_id === user?.id)
    : posts;

  // Hashtag filter
  if (activeHashtag) {
    displayedPosts = displayedPosts.filter((p) =>
      p.content.toLowerCase().includes(`#${activeHashtag.toLowerCase()}`)
    );
  }

  if (loading) {
    return <PostFeedSkeleton />;
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
          { key: "trending" as FeedFilter, label: "Trending", Icon: TrendingUp },
          { key: "friends" as FeedFilter, label: "Friends", Icon: Users },
          { key: "mine" as FeedFilter, label: "My Posts", Icon: Sparkles },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setActiveHashtag(null); }}
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

      {/* Active hashtag chip */}
      <AnimatePresence>
        {activeHashtag && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-medium border border-primary/30">
              #{activeHashtag}
              <button onClick={() => setActiveHashtag(null)} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
            {filter === "friends" ? "No friends' posts yet" : filter === "mine" ? "You haven't posted yet" : filter === "trending" ? "No trending posts yet" : activeHashtag ? `No posts with #${activeHashtag}` : "No posts yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "friends" ? "Add friends to see their posts here!" : filter === "mine" ? "Create your first post above!" : filter === "trending" ? "Posts will trend based on engagement!" : "Be the first to post and earn +10 AURIX!"}
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
                onHashtagClick={handleHashtagClick}
                index={i}
                likeCount={likeCounts[post.id] || 0}
                userLiked={userLikes.has(post.id)}
                trendingRank={filter === "trending" ? trendingRanks[post.id] : undefined}
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
