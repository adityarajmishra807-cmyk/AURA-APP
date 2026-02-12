import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostForm } from "./CreatePostForm";
import { PostCard } from "./PostCard";
import { Sparkles } from "lucide-react";

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

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url, aurix_balance, college_id)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // Flatten profiles from array to object
      const mapped = data.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      }));
      setPosts(mapped);
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

  useEffect(() => {
    fetchPosts();
    fetchUserRatings();
    fetchColleges();
  }, [fetchPosts, fetchUserRatings, fetchColleges]);

  const handleRefresh = () => {
    fetchPosts();
    fetchUserRatings();
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
      <CreatePostForm onPostCreated={handleRefresh} />

      {posts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground">Be the first to post and earn +10 AURIX!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            userRating={userRatings[post.id] ?? null}
            collegeName={post.profiles.college_id ? colleges[post.profiles.college_id] : undefined}
            onRated={handleRefresh}
          />
        ))
      )}
    </div>
  );
}
