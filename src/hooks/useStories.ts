import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

export interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  aurix_balance: number;
  stories: Story[];
  hasUnviewed: boolean;
}

export function useStories() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  const fetchStories = useCallback(async () => {
    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!stories || stories.length === 0) {
      setStoryGroups([]);
      setLoading(false);
      return;
    }

    // Fetch viewed stories for current user
    let viewedIds = new Set<string>();
    if (user) {
      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);
      if (views) {
        viewedIds = new Set(views.map((v: any) => v.story_id));
        setViewedStoryIds(viewedIds);
      }
    }

    // Get unique user IDs
    const userIds = [...new Set(stories.map((s: any) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, aurix_balance")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    // Group stories by user
    const groups: Map<string, StoryGroup> = new Map();
    for (const story of stories as Story[]) {
      if (!groups.has(story.user_id)) {
        const profile = profileMap.get(story.user_id);
        groups.set(story.user_id, {
          user_id: story.user_id,
          username: profile?.username || "Unknown",
          avatar_url: profile?.avatar_url || null,
          aurix_balance: profile?.aurix_balance || 0,
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = groups.get(story.user_id)!;
      group.stories.push(story);
      if (!viewedIds.has(story.id)) {
        group.hasUnviewed = true;
      }
    }

    // Sort: current user first, then by most recent story
    const sorted = [...groups.values()].sort((a, b) => {
      if (user && a.user_id === user.id) return -1;
      if (user && b.user_id === user.id) return 1;
      // Unviewed first
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      const aLatest = new Date(a.stories[a.stories.length - 1].created_at).getTime();
      const bLatest = new Date(b.stories[b.stories.length - 1].created_at).getTime();
      return bLatest - aLatest;
    });

    setStoryGroups(sorted);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const markViewed = useCallback(async (storyId: string) => {
    if (!user || viewedStoryIds.has(storyId)) return;
    setViewedStoryIds((prev) => new Set(prev).add(storyId));
    await supabase
      .from("story_views")
      .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: "story_id,viewer_id" });
  }, [user, viewedStoryIds]);

  const reactToStory = useCallback(async (storyId: string, reactionType: string) => {
    if (!user) return;
    await supabase
      .from("story_reactions")
      .upsert(
        { story_id: storyId, user_id: user.id, reaction_type: reactionType },
        { onConflict: "story_id,user_id" }
      );
  }, [user]);

  const uploadStory = useCallback(async (file: File, caption?: string) => {
    if (!user) return false;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const mediaType = file.type.startsWith("video") ? "video" : "image";

    const { error: uploadErr } = await supabase.storage
      .from("story-media")
      .upload(path, file);

    if (uploadErr) return false;

    const { data: { publicUrl } } = supabase.storage.from("story-media").getPublicUrl(path);

    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      media_url: publicUrl,
      media_type: mediaType,
      caption: caption || null,
    });

    if (!error) {
      await fetchStories();
      return true;
    }
    return false;
  }, [user, fetchStories]);

  return { storyGroups, loading, fetchStories, markViewed, reactToStory, uploadStory, viewedStoryIds };
}
