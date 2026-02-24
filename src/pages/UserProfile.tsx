import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendButton } from "@/components/feed/FriendButton";
import { PostCard } from "@/components/feed/PostCard";
import { Coins, Flame, TrendingUp, Calendar, Sparkles, Award } from "lucide-react";
import { BadgeDisplay } from "@/components/badges/BadgeDisplay";
import { useCosmetics } from "@/hooks/useCosmetics";
import { cn } from "@/lib/utils";

interface UserProfileData {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  aurix_balance: number;
  aurix_lifetime_earned: number;
  streak_count: number;
  highest_streak: number;
  college_id: string | null;
  created_at: string;
}

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

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  const [friendshipId, setFriendshipId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, bio, avatar_url, aurix_balance, aurix_lifetime_earned, streak_count, highest_streak, college_id, created_at")
      .eq("username", username)
      .single();

    if (data) {
      setProfileData(data as UserProfileData);
      if (data.college_id) {
        const { data: college } = await supabase
          .from("colleges")
          .select("name")
          .eq("id", data.college_id)
          .single();
        if (college) setCollegeName(college.name);
      }
    }
    setLoading(false);
  }, [username]);

  const fetchPosts = useCallback(async () => {
    if (!profileData) return;
    const { data } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles!posts_user_id_fkey(username, avatar_url, aurix_balance, college_id)")
      .eq("user_id", profileData.user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      setPosts(
        data.map((p: any) => ({
          ...p,
          profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        }))
      );
    }
  }, [profileData]);

  const fetchRatings = useCallback(async () => {
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

  const fetchFriendship = useCallback(async () => {
    if (!user || !profileData || user.id === profileData.user_id) return;
    const { data } = await supabase
      .from("friends")
      .select("id, requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileData.user_id}),and(requester_id.eq.${profileData.user_id},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (data) {
      setFriendshipId(data.id);
      if (data.status === "accepted") {
        setFriendStatus("accepted");
      } else if (data.requester_id === user.id) {
        setFriendStatus("pending_sent");
      } else {
        setFriendStatus("pending_received");
      }
    } else {
      setFriendStatus("none");
      setFriendshipId(undefined);
    }
  }, [user, profileData]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profileData) {
      fetchPosts();
      fetchRatings();
      fetchFriendship();
    }
  }, [profileData, fetchPosts, fetchRatings, fetchFriendship]);

  const isOwnProfile = user?.id === profileData?.user_id;
  const { cosmetics } = useCosmetics(profileData?.user_id);
  const joinDate = profileData ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-8 animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profileData) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-display text-lg font-bold text-foreground mb-1">User not found</h2>
            <p className="text-sm text-muted-foreground">@{username} doesn't exist.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile header */}
        <motion.div
          className={cn("glass-card rounded-2xl p-5 md:p-8", cosmetics.theme)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4 md:gap-6">
            <Avatar className={cn("w-16 h-16 md:w-20 md:h-20 border-2 border-border shrink-0", cosmetics.frame)}>
              <AvatarImage src={profileData.avatar_url || ""} />
              <AvatarFallback className="bg-muted text-xl md:text-2xl font-display font-bold">
                {profileData.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={cn("font-display text-xl md:text-2xl font-bold", cosmetics.nameColor || "text-foreground")}>
                  @{profileData.username}
                </h1>
                {cosmetics.badge && <span className="text-xl">{cosmetics.badge}</span>}
                {!isOwnProfile && (
                  <FriendButton
                    targetUserId={profileData.user_id}
                    friendStatus={friendStatus}
                    friendshipId={friendshipId}
                    onStatusChange={fetchFriendship}
                    size="sm"
                  />
                )}
              </div>
              {profileData.bio && (
                <p className="text-sm text-muted-foreground mt-1">{profileData.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                {collegeName && <span>{collegeName}</span>}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {joinDate}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Coins className="w-3.5 h-3.5 text-aura-gold" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {profileData.aurix_balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AURIX</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-aura-mint" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {profileData.aurix_lifetime_earned.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earned</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-3.5 h-3.5 text-accent" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {profileData.streak_count}d
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-3.5 h-3.5 text-aura-gold" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {profileData.highest_streak}d
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best</p>
            </div>
          </div>
        </motion.div>

        {/* Achievements section */}
        <motion.div
          className="glass-card rounded-2xl p-5 md:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Achievements</h2>
          </div>
          <BadgeDisplay userId={profileData.user_id} />
        </motion.div>

        {/* Posts section */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            Posts ({posts.length})
          </h2>
          {posts.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  userRating={userRatings[post.id] ?? null}
                  collegeName={collegeName || undefined}
                  onRated={() => { fetchRatings(); fetchPosts(); }}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
